import { AnyWebReadableStream, FileTypeOptions, FileTypeResult } from 'file-type';
import { loadEsm } from 'load-esm';
// utils/extractImageMetadata.ts
import Stream from 'stream';
export const getFileType = async () => {
  return await loadEsm<typeof import('file-type')>('file-type');
};
export const isHEICORHEIF = (ext: string): boolean => {
  return ['heic', 'heif'].includes(ext.replace(/^\./, '').toLowerCase());
};
export const detectMediaType = async (path: string): Promise<FileTypeResult | undefined> => {
  // const files: any = (await await eval('import("file-type")')) as Promise<any>;
  // return { fileTypeFromFile: files.fileTypeFromFile };
  if (!path) {
    return Promise.resolve(undefined);
  }
  const { fileTypeFromFile } = await getFileType();
  return fileTypeFromFile(path);
};
export const detectMediaTypeFromStream = async (
  stream: AnyWebReadableStream<Uint8Array> | Stream.Readable,
  options?: FileTypeOptions
): Promise<FileTypeResult | undefined> => {
  // const files: any = (await await eval('import("file-type")')) as Promise<any>;
  // return { fileTypeFromFile: files.fileTypeFromFile };
  if (!stream) {
    return Promise.resolve(undefined);
  }
  try {
    const { fileTypeFromStream } = await getFileType();
    return await fileTypeFromStream(stream, options);
  } catch (error) {}
  return Promise.resolve(undefined);
};

export const fileTypeByPath = async (path: string): Promise<FileTypeResult | undefined> => {
  try {
    // return await (await detectMediaType()).fileTypeFromFile(path);
    return detectMediaType(path);
  } catch (error) {
    return undefined;
  }
};

export const getExtention = async (
  path?: string,
  file?: any
): Promise<{ ext: string; mime: string } | null> => {
  if (!path) {
    return null;
  }
  let fileType = await fileTypeByPath(path);
  if (!fileType) {
    const result: any = {};
    result.ext = path.split('.')[1];
    if (file) {
      result.mime = file.mimetype;
    }
    return result;
  }
  return fileType;
};
