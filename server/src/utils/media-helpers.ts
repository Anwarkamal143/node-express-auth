import Ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import convert from 'heic-convert';
import sharp from 'sharp';
import { getExtention } from './file-type';
export const isValidUrl = (url: string) => {
  if (!url) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};
export const unlinkSyncFile = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
    return filePath;
  } catch (error) {
    console.warn({ error, filePath }, 'Failed to unlink file');
    return null;
  }
};
export const convertHeicToFormat = async (filePath: string): Promise<string | null> => {
  try {
    const inputBuffer = await fs.readFile(filePath);
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'PNG',
      quality: 1,
    });
    const convertedPath = `${filePath.split('.')[0]}.png`;
    await fs.writeFile(convertedPath, outputBuffer as Buffer);
    return convertedPath;
  } catch (error) {
    console.error({ error, filePath }, 'HEIC to PNG conversion failed');
    return null;
  }
};

export const convertVideoToMP4 = async (filePath: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const output = `${filePath.split('.')[0]}.mp4`;
    Ffmpeg(filePath)
      .output(output)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', async () => {
        await unlinkSyncFile(filePath);
        resolve(output);
      })
      .on('error', async (err: any) => {
        console.error({ err }, 'Video conversion failed');
        await unlinkSyncFile(filePath);
        resolve(null);
      })
      .run();
  });
};

export const convertImageToPNG = async (filePath: string): Promise<string | null> => {
  const output = `${filePath.split('.')[0]}.png`;
  try {
    await sharp(filePath).png({ quality: 80 }).toFile(output);
    await unlinkSyncFile(filePath);
    return output;
  } catch (error) {
    console.error({ error, filePath }, 'Image conversion to PNG failed');
    await unlinkSyncFile(filePath);
    return null;
  }
};

export const convertMediaBeforeUpload = async (file: File | any) => {
  const fileType = await getExtention(file.path, file);

  if (!fileType || !fileType.mime) return null;

  const validMime = /^image\/(jpeg|png|heic|jpg)$|^video\/mp4$/;
  if (!validMime.test(fileType.mime)) {
    await unlinkSyncFile(file.path);
    throw new Error(`Unsupported file type: ${fileType.mime}`);
  }

  if (fileType.ext === 'png' || fileType.ext === 'mp4') {
    return file.path;
  }

  let convertedPath: string | null = null;

  if (fileType.mime.startsWith('image/')) {
    if (fileType.ext === 'heic') {
      convertedPath = await convertHeicToFormat(file.path);
    } else {
      convertedPath = await convertImageToPNG(file.path);
    }
  } else if (fileType.mime.startsWith('video/')) {
    convertedPath = await convertVideoToMP4(file.path);
  }

  await unlinkSyncFile(file.path);
  return convertedPath;
};
