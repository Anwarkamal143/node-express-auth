import IoRedis from '@/app-redis';
import { HTTPSTATUS } from '@/config/http.config';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/catch-errors';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
];

async function ensureDirectoryExists(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function initializeDirectories() {
  await ensureDirectoryExists(UPLOADS_DIR);
  await ensureDirectoryExists(TEMP_DIR);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function saveChunk(uploadId: string, chunkIndex: number, buffer: Buffer): Promise<void> {
  const chunkFileName = `${uploadId}_chunk_${chunkIndex}`;
  const chunkPath = path.join(TEMP_DIR, chunkFileName);
  await fs.writeFile(chunkPath, buffer);
}

async function assembleFile(
  uploadId: string,
  totalChunks: number,
  fileName: string
): Promise<string> {
  const sanitizedFileName = sanitizeFileName(fileName);
  const fileExtension = path.extname(sanitizedFileName);
  const baseName = path.basename(sanitizedFileName, fileExtension);
  const uniqueFileName = `${baseName}_${uuidv4()}${fileExtension}`;
  const finalPath = path.join(UPLOADS_DIR, uniqueFileName);
  const writeStream = await fs.open(finalPath, 'w');

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(TEMP_DIR, `${uploadId}_chunk_${i}`);
      const chunkData = await fs.readFile(chunkPath);
      await writeStream.write(chunkData);
      await fs.unlink(chunkPath);
    }
  } finally {
    await writeStream.close();
  }

  return `/uploads/${uniqueFileName}`;
}

async function cleanupUpload(uploadId: string, totalChunks: number): Promise<void> {
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(TEMP_DIR, `${uploadId}_chunk_${i}`);
    try {
      await fs.unlink(chunkPath);
    } catch {}
  }
  await IoRedis.redis.del(`upload:${uploadId}`);
}

export class UploadService {
  async handleChunkUpload({
    chunk,
    chunkIndex,
    totalChunks,
    uploadId,
    fileName,
    fileType,
    fileSize,
  }: {
    chunk: Buffer;
    chunkIndex: number;
    totalChunks: number;
    uploadId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) {
    await initializeDirectories();

    if (
      !chunk ||
      !uploadId ||
      !fileName ||
      !fileType ||
      isNaN(chunkIndex) ||
      isNaN(totalChunks) ||
      isNaN(fileSize)
    ) {
      return { error: new BadRequestException('Missing required fields') };
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return { error: new BadRequestException('Unsupported file type') };
    }

    if (chunkIndex < 0 || chunkIndex >= totalChunks || fileSize > MAX_FILE_SIZE) {
      return { error: new BadRequestException('Invalid chunk index or file too large') };
    }

    const metadataKey = `upload:${uploadId}`;
    let metadata = await IoRedis.redis.get(metadataKey);
    let parsed = metadata
      ? JSON.parse(metadata)
      : {
          fileName,
          fileType,
          fileSize,
          totalChunks,
          uploadedChunks: [],
          createdAt: Date.now(),
        };

    if (parsed.fileName !== fileName || parsed.totalChunks !== totalChunks) {
      return { error: new BadRequestException('Upload metadata mismatch') };
    }

    if (!parsed.uploadedChunks.includes(chunkIndex)) {
      await saveChunk(uploadId, chunkIndex, chunk);
      parsed.uploadedChunks.push(chunkIndex);
      await IoRedis.redis.set(metadataKey, JSON.stringify(parsed));
    }

    const isComplete = parsed.uploadedChunks.length === totalChunks;
    let finalUrl;

    if (isComplete) {
      try {
        finalUrl = await assembleFile(uploadId, totalChunks, fileName);
        await cleanupUpload(uploadId, totalChunks);
      } catch (err) {
        await cleanupUpload(uploadId, totalChunks);
        return { error: new InternalServerException('Failed to assemble file') };
      }
    }

    return {
      success: true,
      chunkIndex,
      uploadId,
      totalChunks,
      isComplete,
      finalUrl,
      status: HTTPSTATUS.OK,
    };
  }

  async getUploadStatus(uploadId: string) {
    if (!uploadId) return { error: new BadRequestException('Upload ID required') };
    const metadata = await IoRedis.redis.get(`upload:${uploadId}`);
    if (!metadata) return { error: new NotFoundException('Upload not found') };

    const parsed = JSON.parse(metadata);
    return {
      uploadId,
      ...parsed,
      progress: Math.round((parsed.uploadedChunks.length / parsed.totalChunks) * 100),
      status: HTTPSTATUS.OK,
    };
  }

  async cleanupUpload(uploadId: string) {
    if (!uploadId) return { error: new BadRequestException('Upload ID required') };
    const metadata = await IoRedis.redis.get(`upload:${uploadId}`);
    if (!metadata) return { error: new NotFoundException('Upload not found') };

    const { totalChunks } = JSON.parse(metadata);
    await cleanupUpload(uploadId, totalChunks);
    return { success: true, status: HTTPSTATUS.OK };
  }
}

export const uploadService = new UploadService();
