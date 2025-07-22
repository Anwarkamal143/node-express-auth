// types/upload.types.ts

type ChunkUploadRequestBody = {
  chunkIndex: string;
  totalChunks: string;
  uploadId: string;
  fileName: string;
  fileType: string;
  fileSize: string;
};

type UploadMetadata = {
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  createdAt: number;
};

type ChunkUploadResponse = {
  success: boolean;
  chunkIndex: number;
  uploadId: string;
  totalChunks: number;
  isComplete: boolean;
  finalUrl?: string;
};

type UploadStatusResponse = UploadMetadata & {
  uploadId: string;
  progress: number;
};
