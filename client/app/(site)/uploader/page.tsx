// components/MediaUploader.tsx
"use client";

import { API_BASE_URL } from "@/config";
import {
  AlertCircle,
  CheckCircle,
  File,
  Image,
  Upload,
  Video,
  X,
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  fileSize: number;
  uploadedSize: number;
  fileType: string;
}

interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  totalChunks: number;
  uploadId: string;
  isComplete?: boolean;
  finalUrl?: string;
  error?: string;
}

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size
const ALLOWED_TYPES = ["image/*", "video/*", "audio/*"];

export default function MediaUploader() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(
    new Map()
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const generateUploadId = () =>
    `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="w-5 h-5" />;
    if (fileType.startsWith("video/")) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`;
    }

    const isValidType = ALLOWED_TYPES.some(
      (type) => type === "*/*" || file.type.match(type.replace("*", ".*"))
    );

    if (!isValidType) {
      return "File type not supported";
    }

    return null;
  };

  const uploadChunk = async (
    file: File,
    chunkIndex: number,
    totalChunks: number,
    uploadId: string,
    chunk: Blob,
    abortSignal: AbortSignal
  ): Promise<ChunkUploadResponse> => {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("uploadId", uploadId);
    formData.append("fileName", file.name);
    formData.append("fileType", file.type);
    formData.append("fileSize", file.size.toString());

    const response = await fetch(API_BASE_URL + "upload/chunk", {
      method: "POST",
      body: formData,
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  };

  const uploadFile = useCallback(async (file: File) => {
    const uploadId = generateUploadId();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setUploads((prev) =>
        new Map(prev).set(uploadId, {
          fileName: file.name,
          progress: 0,
          status: "error",
          error: validationError,
          fileSize: file.size,
          uploadedSize: 0,
          fileType: file.type,
        })
      );
      return;
    }

    // Initialize upload progress
    setUploads((prev) =>
      new Map(prev).set(uploadId, {
        fileName: file.name,
        progress: 0,
        status: "uploading",
        fileSize: file.size,
        uploadedSize: 0,
        fileType: file.type,
      })
    );

    // Create abort controller
    const abortController = new AbortController();
    abortControllers.current.set(uploadId, abortController);

    try {
      let uploadedSize = 0;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortController.signal.aborted) {
          throw new Error("Upload cancelled");
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const result = await uploadChunk(
          file,
          chunkIndex,
          totalChunks,
          uploadId,
          chunk,
          abortController.signal
        );

        uploadedSize += chunk.size;
        const progress = Math.round((uploadedSize / file.size) * 100);

        setUploads((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(uploadId);
          if (current) {
            newMap.set(uploadId, {
              ...current,
              progress,
              uploadedSize,
            });
          }
          return newMap;
        });

        if (result.isComplete) {
          setUploads((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(uploadId);
            if (current) {
              newMap.set(uploadId, {
                ...current,
                status: "completed",
                progress: 100,
              });
            }
            return newMap;
          });
          break;
        }
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        setUploads((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(uploadId);
          if (current) {
            newMap.set(uploadId, {
              ...current,
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
            });
          }
          return newMap;
        });
      }
    } finally {
      abortControllers.current.delete(uploadId);
    }
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      uploadFile(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const cancelUpload = (uploadId: string) => {
    const controller = abortControllers.current.get(uploadId);
    if (controller) {
      controller.abort();
      setUploads((prev) => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
  };

  const clearCompleted = () => {
    setUploads((prev) => {
      const newMap = new Map();
      prev.forEach((upload, id) => {
        if (upload.status === "uploading") {
          newMap.set(id, upload);
        }
      });
      return newMap;
    });
  };

  const uploadsArray = Array.from(uploads.entries());
  const activeUploads = uploadsArray.filter(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_, upload]) => upload.status === "uploading"
  );
  const completedUploads = uploadsArray.filter(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_, upload]) => upload.status === "completed"
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Media Uploader</h2>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports images, videos, and audio files up to{" "}
          {formatFileSize(MAX_FILE_SIZE)}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Select Files
        </button>
      </div>

      {/* Upload Progress */}
      {uploadsArray.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Uploads ({uploadsArray.length})
            </h3>
            {completedUploads.length > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Completed
              </button>
            )}
          </div>

          <div className="space-y-4">
            {uploadsArray.map(([uploadId, upload]) => (
              <div
                key={uploadId}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(upload.fileType)}
                    <div>
                      <p className="font-medium text-gray-800 truncate max-w-xs">
                        {upload.fileName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(upload.uploadedSize)} /{" "}
                        {formatFileSize(upload.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {upload.status === "uploading" && (
                      <button
                        onClick={() => cancelUpload(uploadId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {upload.status === "completed" && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <button
                          onClick={() => removeUpload(uploadId)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {upload.status === "error" && (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <button
                          onClick={() => removeUpload(uploadId)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {upload.status === "uploading" && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}

                {upload.status === "completed" && (
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-full" />
                  </div>
                )}

                {upload.status === "error" && (
                  <div className="mt-2">
                    <p className="text-sm text-red-600">
                      Error: {upload.error}
                    </p>
                  </div>
                )}

                {upload.status === "uploading" && (
                  <p className="text-sm text-gray-600 mt-2">
                    {upload.progress}% complete
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {activeUploads.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            {activeUploads.length} file(s) uploading...
          </p>
        </div>
      )}
    </div>
  );
}
