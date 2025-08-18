import IoRedis from '@/app-redis';
import { HTTPSTATUS, HttpStatusCode } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';
import { BadRequestException } from '@/utils/catch-errors';
import { detectMediaTypeFromStream, fileTypeByPath, isHEICORHEIF } from '@/utils/file-type';
import {
  convertHeicToPNG,
  extractMediaMetadataFromPath,
  unlinkSyncFile,
} from '@/utils/media-helpers';
import { SuccessResponse } from '@/utils/requestResponse';
import Busboy from 'busboy';
import { Request, Response } from 'express';
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const TEMP_DIR = path.join(process.cwd(), 'uploads/temp');
const FINAL_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'audio/mpeg',
]);
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const REDIS_TTL = 3600; // seconds

function checkAndCreateDirectory(dir: string): void {
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  } catch (err) {
    console.error(`Failed to ensure directory: ${dir}`, err);
    throw new Error(`Directory setup failed for ${dir}`);
  }
}
function ensureDirectories() {
  [TEMP_DIR, FINAL_DIR].forEach((dir) => {
    checkAndCreateDirectory(dir);
  });
}
ensureDirectories();

// Helpers
function tempPath(id: string, idx: number) {
  return path.join(TEMP_DIR, `${id}_chunk_${idx}`);
}
async function convertHeic(filePath: string): Promise<string | null> {
  const ext = path.extname(filePath);
  if (!isHEICORHEIF(ext)) return null;

  const info = await fileTypeByPath(filePath);
  if (!info?.mime || !isHEICORHEIF(info.ext)) return null;

  return path.basename((await convertHeicToPNG(filePath)) as string);
}

export const uploadChunkStream = async (req: Request, res: Response) => {
  const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });
  let fileHandled = false;
  function sendError(code: HttpStatusCode, message: string, errorCode: ErrorCode) {
    if (fileHandled) return;

    return SuccessResponse(res, {
      message,
      data: null,
      success: false,
      statusCode: code,
      errorCode,
    });
  }

  busboy.on('error', (err) => {
    console.log('Upload parsing failed', err);
    return sendError(HTTPSTATUS.BAD_REQUEST, 'Upload parsing failed', ErrorCode.BAD_REQUEST);
  });

  const fields: Record<string, string> = {};
  busboy.on('field', (name, val) => {
    fields[name] = val;
  });

  busboy.on('file', async (fieldname, stream) => {
    if (fieldname !== 'chunk') return;
    try {
      fileHandled = true;
      const {
        uploadId,
        chunkIndex,
        totalChunks,
        fileName,
        fileType,
        fileSize,
        destination = 'local',
      } = fields;

      // Validate presence
      if (!uploadId || !fileName || !fileType || !fileSize || !chunkIndex || !totalChunks) {
        return sendError(HTTPSTATUS.BAD_REQUEST, 'Missing upload metadata', ErrorCode.BAD_REQUEST);
      }

      const idx = Number(chunkIndex);
      const total = Number(totalChunks);
      const size = Number(fileSize);

      // Basic sanity checks
      if (
        !Number.isInteger(idx) ||
        !Number.isInteger(total) ||
        !Number.isInteger(size) ||
        idx < 0 ||
        idx >= total ||
        size > MAX_FILE_SIZE ||
        !ALLOWED_TYPES.has(fileType)
      ) {
        return sendError(HTTPSTATUS.BAD_REQUEST, 'Invalid file metadata', ErrorCode.BAD_REQUEST);
      }

      const sanitized = path.basename(fileName).replace(/[^a-z0-9._-]/gi, '_');
      const chunkPath = tempPath(uploadId, idx);
      await pipeline(stream, createWriteStream(chunkPath));

      // Update Redis
      const metaKey = `upload:${uploadId}`;
      const raw = await IoRedis.redis.get(metaKey);
      const meta = raw
        ? JSON.parse(raw)
        : {
            fileName: sanitized,
            fileType,
            fileSize: size,
            totalChunks: total,
            uploaded: [] as number[],
            created: Date.now(),
          };

      if (!meta.uploaded.includes(idx)) {
        meta.uploaded.push(idx);
        await IoRedis.redis.setex(metaKey, REDIS_TTL, JSON.stringify(meta));
      }

      const isLast = meta.uploaded.length === total;
      let finalUrl: string | null = null;
      let metadata = null;

      if (isLast) {
        // Assemble
        const finalName = (async () => {
          const ext = path.extname(sanitized);
          const base = path.basename(sanitized, ext);
          let dest = `${base}_${uuidv4()}${ext}`;

          const typeInfo = await detectMediaTypeFromStream(createReadStream(tempPath(uploadId, 0)));
          if (typeInfo?.mime.startsWith('video/')) {
            const videoDir = path.join(FINAL_DIR, 'videos');
            if (!existsSync(videoDir)) mkdirSync(videoDir, { recursive: true });
            dest = `videos/${base}_${uuidv4()}.${typeInfo.ext}`;
          }
          return dest;
        })();

        const destName = await finalName;
        const finalPath = path.join(FINAL_DIR, destName);
        const writeStream = createWriteStream(finalPath);

        try {
          for (let i = 0; i < total; i++) {
            const chunkFile = tempPath(uploadId, i);
            if (!existsSync(chunkFile)) throw new Error(`Missing chunk ${i}`);
            await new Promise<void>((resolve, reject) => {
              const readStream = createReadStream(chunkFile);
              readStream.on('error', reject);
              readStream.on('end', async () => {
                try {
                  unlinkSync(chunkFile);
                } catch (e) {
                  console.warn(`Failed to delete chunk ${i}:`, e);
                }
                resolve();
              });
              readStream.pipe(writeStream, { end: false });
            });
          }
          writeStream.end();
          await new Promise((r, e) => writeStream.once('finish', r as any).once('error', e));

          // HEIC conversion
          const converted = await convertHeic(finalPath);
          const finalFile = converted || destName;
          if (converted) {
            try {
              await unlinkSyncFile(finalPath);
            } catch (error) {
              console.log('Already Unlinked');
            }
          }

          // Extract metadata
          metadata = await extractMediaMetadataFromPath(path.join(FINAL_DIR, finalFile));
          const domain = `${req.protocol}://${req.get('host')}`;
          if (metadata?.thumbnail) metadata.thumbnail = `${domain}${metadata.thumbnail}`;

          // TODO: upload to cloudinary/S3 based on destination

          finalUrl = `${domain}/uploads/${finalFile}`;
          console.log(finalUrl, 'finalUrl');
          await IoRedis.redis.del(metaKey);
        } catch (err) {
          await IoRedis.redis.del(metaKey);
          return sendError(
            HTTPSTATUS.INTERNAL_SERVER_ERROR,
            'Failed to assemble file',
            ErrorCode.INTERNAL_SERVER_ERROR
          );
        }
      }

      return SuccessResponse(res, {
        message: isLast ? 'Upload complete' : 'Chunk received',
        data: {
          isComplete: isLast,
          uploadId,
          chunkIndex: idx,
          totalChunks: total,
          metadata: { ...(metadata || {}), url: finalUrl, id: uploadId },
        },
        success: true,
      });
    } catch (err) {
      return sendError(
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        'File processing failed',
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  });

  busboy.on('finish', () => {
    if (!fileHandled) sendError(HTTPSTATUS.BAD_REQUEST, 'No file uploaded', ErrorCode.BAD_REQUEST);
  });

  req.pipe(busboy);
};

export async function getUploadStatus(uploadId: string) {
  if (!uploadId) throw new BadRequestException('Upload ID required');
  const raw = await IoRedis.redis.get(`upload:${uploadId}`);
  if (!raw)
    return {
      uploadId,
      progress: 0,
      statusCode: HTTPSTATUS.NOT_FOUND,
      errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      success: false,
      message: 'Upload not found',
    };
  const meta = JSON.parse(raw);
  return {
    uploadId,
    ...meta,
    progress: Math.round((meta.uploaded.length / meta.totalChunks) * 100),
    statusCode: HTTPSTATUS.OK,
  };
}
