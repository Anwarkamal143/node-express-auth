import { fileTypeFromFile, FileTypeResult } from 'file-type';

export const detectMediaType = async (
  path: string
): Promise<FileTypeResult | undefined> => {
  // const files: any = (await await eval('import("file-type")')) as Promise<any>;
  // return { fileTypeFromFile: files.fileTypeFromFile };
  if (!path) {
    return Promise.resolve(undefined);
  }
  return fileTypeFromFile(path);
};

export const fileTypeByPath = async (
  path: string
): Promise<FileTypeResult | undefined> => {
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
