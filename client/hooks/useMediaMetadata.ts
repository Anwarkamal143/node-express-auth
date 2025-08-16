import { useState } from "react";

export interface MediaMetadata {
  type: "image" | "video";
  name: string;
  fileType: string;
  sizeMB: number;
  width: number;
  height: number;
  duration?: number;
  source: "local";
}

// Lazy-loaded import for file-type
let fileTypeModule: typeof import("file-type") | null = null;
async function getFileTypeModule() {
  if (!fileTypeModule) {
    fileTypeModule = await import("file-type");
  }
  return fileTypeModule;
}

export function useMediaMetadata() {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const extract = async (
    file: File
  ): Promise<{ thumbnail: string; metadata: MediaMetadata }> => {
    if (!(file instanceof File)) {
      throw new Error("Only local File input is supported.");
    }

    const objectUrl = URL.createObjectURL(file);

    // --- Detect file type ---
    let mime = file.type;
    try {
      const fileType = await getFileTypeModule();
      const result = await fileType.fileTypeFromBlob(file);
      if (result?.mime) {
        mime = result.mime;
      }
    } catch {
      mime = file.type || "application/octet-stream";
    }

    const isVideo = mime.startsWith("video/");
    const isImage = mime.startsWith("image/");

    if (isImage) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = objectUrl;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("No canvas context"));

          ctx.drawImage(img, 0, 0);
          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

          const meta: MediaMetadata = {
            type: "image",
            name: file.name,
            fileType: mime,
            sizeMB: +(file.size / 1024 / 1024).toFixed(2),
            width: img.width,
            height: img.height,
            source: "local",
          };

          setMetadata(meta);
          setThumbnail(thumbnailUrl);
          URL.revokeObjectURL(objectUrl);
          resolve({ thumbnail: thumbnailUrl, metadata: meta });
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image"));
        };
      });
    }

    if (isVideo) {
      return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.src = objectUrl;
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          const meta: MediaMetadata = {
            type: "video",
            name: file.name,
            fileType: mime,
            sizeMB: +(file.size / 1024 / 1024).toFixed(2),
            width: video.videoWidth,
            height: video.videoHeight,
            duration: +video.duration.toFixed(2),
            source: "local",
          };

          setMetadata(meta);
          video.currentTime = Math.min(0.5, video.duration / 2); // seek for thumbnail
        };

        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load video"));
        };

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            return reject(new Error("No canvas context"));
          }

          ctx.drawImage(video, 0, 0);
          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
          setThumbnail(thumbnailUrl);
          URL.revokeObjectURL(objectUrl);
          resolve({ thumbnail: thumbnailUrl, metadata: metadata! });
        };
      });
    }

    URL.revokeObjectURL(objectUrl);
    throw new Error(`Unsupported media type: ${mime}`);
  };

  return {
    extract,
    thumbnail,
    metadata,
  };
}
