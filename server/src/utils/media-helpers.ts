import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeStatic from '@ffprobe-installer/ffprobe';
import { FileTypeResult } from 'file-type';
import ffmpeg from 'fluent-ffmpeg';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import convert from 'heic-convert';
import path from 'path';
import sharp from 'sharp';
import Stream, { Readable } from 'stream';
import { detectMediaType, getFileType, isHEICORHEIF } from './file-type';
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

ffmpeg.setFfprobePath(ffprobeStatic.path);

export interface PartialMediaMetadata {
  mime: string;
  ext: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  duration?: number;
  bitrate?: number;
  formatName?: string;
  codec?: string;
  frameRate?: number;
  formatTime?: string;
  thumbnail?: string; // Path to the thumbnail image
}

const parseFraction = (input: string): number => {
  const [numerator, denominator] = input.split('/').map(Number);
  return denominator ? numerator / denominator : 0;
};
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0s';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hrs > 0 || mins > 0) parts.push(`${hrs}`);
  if (mins > 0 || hrs > 0 || secs > 0) parts.push(`${mins}`);
  parts.push(`${secs}`);

  return parts.join(':');
}

export async function unlinkSyncFile(filePath: string): Promise<string | null> {
  try {
    await unlinkSyncFile(filePath);
    return filePath;
  } catch (error) {
    console.warn('Failed to unlink file:', filePath, error);
    return null;
  }
}

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function convertHeicStreamToPNG(stream: Stream.Readable) {
  const buffer = await streamToBuffer(stream);
  return await convert({ buffer: buffer as unknown as ArrayBuffer, format: 'PNG', quality: 1 });
}

export async function convertHeicToPNG(filePath: string, unlink = true): Promise<string | null> {
  try {
    const detected = await detectMediaType(filePath);
    if (!detected || !isHEICORHEIF(detected.ext)) {
      throw new Error(`Invalid HEIC/HEIF file: detected ${detected?.mime}`);
    }

    const inputBuffer = await fs.readFile(filePath);
    const outputBuffer = await convert({
      buffer: inputBuffer as unknown as ArrayBuffer,
      format: 'PNG',
      quality: 1,
    });

    const convertedPath = path.format({
      dir: path.dirname(filePath),
      name: path.parse(filePath).name,
      ext: '.png',
    });

    await fs.writeFile(convertedPath, Buffer.from(outputBuffer));
    if (unlink) await unlinkSyncFile(filePath);
    return convertedPath;
  } catch (error) {
    console.error('HEIC to PNG conversion failed:', error);
    return null;
  }
}

export async function convertImageToPNG(filePath: string): Promise<string | null> {
  const output = path.format({
    dir: path.dirname(filePath),
    name: path.parse(filePath).name,
    ext: '.png',
  });

  try {
    await sharp(filePath).png({ quality: 80 }).toFile(output);
    await unlinkSyncFile(filePath);
    return output;
  } catch (error) {
    console.error('Image to PNG conversion failed:', error);
    await unlinkSyncFile(filePath);
    return null;
  }
}

export async function convertVideoToMP4(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const output = path.format({
      dir: path.dirname(filePath),
      name: path.parse(filePath).name,
      ext: '.mp4',
    });

    ffmpeg(filePath)
      .output(output)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', async () => {
        await unlinkSyncFile(filePath);
        resolve(output);
      })
      .on('error', async (err) => {
        console.error('Video conversion failed:', err);
        await unlinkSyncFile(filePath);
        resolve(null);
      })
      .run();
  });
}

export async function extractImageMetadataFromBuffer(
  buffer: Buffer
): Promise<PartialMediaMetadata | null> {
  try {
    const { fileTypeFromBuffer } = await getFileType();
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType || !fileType.mime.startsWith('image/')) return null;

    const metadata = await sharp(buffer).metadata();
    return {
      mime: fileType.mime,
      ext: fileType.ext,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      type: 'image',
    };
  } catch (err) {
    console.error('Image metadata extraction failed:', err);
    return null;
  }
}

export async function extractVideoMetadataFromPath(
  filePath: string,
  type: FileTypeResult
): Promise<PartialMediaMetadata | null> {
  return new Promise((resolve, reject) => {
    try {
      ffmpeg.ffprobe(filePath, async (err, metadata) => {
        if (err) return reject(new Error(`Failed to extract metadata: ${err.message}`));

        try {
          const stream = metadata.streams?.find((s) => s.codec_type === 'video');
          if (!stream) return reject(new Error('No video stream found'));

          // Extract cover (screenshot at 1s)
          const coverPath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, path.extname(filePath))}_cover.jpg`
          );
          const cover = await generateVideoCover(filePath, coverPath, 1);
          // if (!cover) return reject(new Error('Failed to generate video cover'));
          console.log(cover, 'cover path');
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitrate: metadata.format.bit_rate,
            formatName: metadata.format.format_name,
            codec: stream.codec_name,
            width: stream.width,
            height: stream.height,
            frameRate: parseFraction(stream.avg_frame_rate || '0/1'),
            type: 'video',
            ext: type.ext,
            mime: type.mime,
            formatTime: formatDuration(metadata.format.duration!),
            thumbnail: cover, // Use the generated cover image
          } as PartialMediaMetadata);
        } catch (innerErr) {
          reject(innerErr);
        }
      });
    } catch (outerErr) {
      reject(outerErr);
    }
  });
}

export async function extractImageMetadataFromPath(
  filePath: string,
  type: FileTypeResult
): Promise<PartialMediaMetadata | null> {
  try {
    const stream = createReadStream(filePath);
    const buffer = await streamToBuffer(stream);
    const metadata = await sharp(buffer).metadata();
    return {
      mime: type.mime,
      ext: type.ext,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      type: 'image',
    };
  } catch (err) {
    console.error('Image metadata extraction failed from path:', err);
    return null;
  }
}

export async function extractMediaMetadataFromPath(
  filePath: string
): Promise<PartialMediaMetadata | null> {
  const { fileTypeFromFile } = await getFileType();
  const type = await fileTypeFromFile(filePath);
  if (!type) return null;

  if (type.mime.startsWith('image/')) {
    return extractImageMetadataFromPath(filePath, type);
  } else if (type.mime.startsWith('video/')) {
    return extractVideoMetadataFromPath(filePath, type);
  }
  return null;
}
/**
 * Extracts a thumbnail from a video file
 * @param videoPath Full path to the video file
 * @param outputImagePath Path to save the output thumbnail
 * @param timestamp Seconds into the video to take the snapshot
 */
export function generateVideoCover(
  videoPath: string,
  outputImagePath: string,
  timestamp: number = 1 // default to 1 second
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => {
        resolve(outputImagePath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputImagePath),
        folder: path.dirname(outputImagePath),
        size: '640x?',
      });
  });
}

export const extractVideoMetadataFromStream = (stream: Readable): Promise<ffmpeg.FfprobeData> => {
  return new Promise((resolve, reject) => {
    ffmpeg(stream)
      .inputFormat('mp4') // You may detect format before this
      .ffprobe((err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
  });
};
