import { useState } from "react";

export interface MediaMetadata {
  type: "image" | "video";
  name?: string;
  fileType: string;
  sizeMB?: number;
  width: number;
  height: number;
  duration?: number; // Only for videos
  source: "local" | "remote";
}

type InputSource = File | string;

export function useMediaMetadata() {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const extract = (
    input: InputSource
  ): Promise<{ thumbnail: string; metadata: MediaMetadata }> => {
    return new Promise((resolve, reject) => {
      const isRemote = typeof input === "string";
      const isFile = input instanceof File;
      const url = isRemote ? input : URL.createObjectURL(input);

      const fileType = isRemote
        ? url.split(".").pop()?.toLowerCase() || ""
        : input.type;

      const isVideo =
        fileType.startsWith("video") || /(mp4|webm|ogg)$/i.test(fileType);
      const isImage =
        fileType.startsWith("image") ||
        /(png|jpe?g|webp|gif|heic|heif)$/i.test(fileType);

      if (isImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;

        img.onload = () => {
          const meta: MediaMetadata = {
            type: "image",
            fileType,
            width: img.width,
            height: img.height,
            source: isRemote ? "remote" : "local",
          };

          if (isFile && input instanceof File) {
            meta.name = input.name;
            meta.sizeMB = parseFloat((input.size / 1024 / 1024).toFixed(2));
          }

          setMetadata(meta);
          setThumbnail(url);
          resolve({ thumbnail: url, metadata: meta });
          if (!isRemote) URL.revokeObjectURL(url);
        };

        img.onerror = () => reject(new Error("Failed to load image."));
      } else if (isVideo) {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.src = url;

        video.onloadedmetadata = () => {
          const meta: MediaMetadata = {
            type: "video",
            fileType,
            width: video.videoWidth,
            height: video.videoHeight,
            duration: parseFloat(video.duration.toFixed(2)),
            source: isRemote ? "remote" : "local",
          };

          if (isFile && input instanceof File) {
            meta.name = input.name;
            meta.sizeMB = parseFloat((input.size / 1024 / 1024).toFixed(2));
          }

          setMetadata(meta);

          video.currentTime = 1; // Seek to 1s for thumbnail
        };

        video.onerror = () => reject(new Error("Failed to load video."));

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context is null"));
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL("image/jpeg", 0.8);

          setThumbnail(dataURL);
          resolve({ thumbnail: dataURL, metadata: metadata! });

          if (!isRemote) URL.revokeObjectURL(url);
        };
      } else {
        reject(new Error("Unsupported media type"));
      }
    });
  };

  return {
    extract,
    thumbnail,
    metadata,
  };
}
