import { API_BASE_URL } from "@/config";
import { generateUUID, wait } from "@/lib";
import {
  ABORT_REASONS,
  UploadStore,
  useGetGroupById,
  useStoreUploaderActions,
} from "@/store/useUploadStoreResume";
import axios from "axios";
import { useCallback } from "react";
import { useMediaMetadata } from "./useMediaMetadata";

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000; // 4 second delay between retries
type IUploadFile = {
  groupId: string;
  fileId: string;
  file: File;
  controller: AbortController;
  startChunkIndex?: number;
  startTime?: number;
};
export const useFileUploadResume = () => {
  const getMediaMetaData = useMediaMetadata();
  const {
    onAddFile,
    onUpdateFile,
    onAddGroup,
    onUpdateProgress,
    onMarkFileFailed,
    onCancelFile,
    onCancelGroup,
    onUpdateGroup,
    onRemoveFile,
    onResumeByFileIdGroupId,
    onPauseByFileIdGroupId,
  } = useStoreUploaderActions();
  const getGroup = useGetGroupById();

  const uploadFile = useCallback(
    async (props: IUploadFile) => {
      const {
        groupId,
        fileId,
        file,
        controller,
        startChunkIndex = 0,
        startTime = Date.now(),
      } = props;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      // const uploadId = generateUUID();
      // const startTime = Date.now();
      let res;

      for (
        let chunkIndex = startChunkIndex;
        chunkIndex < totalChunks;
        chunkIndex++
      ) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("uploadId", fileId);
        formData.append("fileName", file.name);
        formData.append("fileType", file.type);
        formData.append("fileSize", file.size.toString());
        formData.append(
          "lastChunk",
          (chunkIndex === totalChunks - 1).toString()
        );
        formData.append("chunk", chunk, `${file.name}.part${chunkIndex}`);
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            res = await axios.post(`${API_BASE_URL}/media/chunk`, formData, {
              signal: controller.signal,
              onUploadProgress: (e) => {
                const elapsed = (Date.now() - startTime) / 1000;
                const chunkProgress = e.loaded / chunk.size;
                let progress =
                  ((chunkIndex + chunkProgress) / totalChunks) * 100;
                // Minus one for server response delay
                progress = Math.min(progress, 99.9); // Prevent overflow
                // const progress =
                //   ((chunkIndex + e.loaded / chunk.size) / totalChunks) * 100;
                onUpdateProgress({
                  groupId,
                  fileId,
                  progress,
                  elapsedTime: elapsed,
                });
              },
            });
            if (res?.status !== 200 || !res?.data) {
              onMarkFileFailed(groupId, fileId, "Upload failed");
              return;
            }
            // uploadedSize += chunk.size;
            const progress = ((chunkIndex + 1) / totalChunks) * 100;
            const elapsedTime = (Date.now() - startTime) / 1000;
            const data = res.data?.data;
            // console.log({ data, progress, fileId });
            onUpdateProgress({
              groupId,
              fileId,
              progress,
              elapsedTime,

              data: data?.metadata,
            });
            onUpdateFile(groupId, {
              id: fileId,
              uploadedChunkIndex: chunkIndex + 1, // Update uploaded chunk index
            });
            break;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            const newChunkIndex = chunkIndex > 0 ? chunkIndex - 1 : 0;
            const progress = (newChunkIndex / totalChunks) * 100;
            const isAborted = controller.signal.aborted;

            console.warn("Upload cancelled", file.name);
            if (
              controller.signal.aborted &&
              controller.signal.reason === ABORT_REASONS.PAUSED
            ) {
              console.warn("Upload aborted", file.name);
              onUpdateFile(groupId, {
                id: fileId,
                status: "paused",
                controller: undefined,
                progress,
              });
              break;
              // onPauseByFileIdGroupId(groupId, fileId);
              // return;
            }
            if (attempt === MAX_RETRIES - 1 || isAborted) {
              console.error("Upload failed after retries", file.name, err);
              onUpdateFile(groupId, {
                id: fileId,
                progress,
                elapsedTime: (Date.now() - startTime) / 1000,
              });
              const errorMessage =
                err?.response?.data?.message || err?.message || "Upload failed";
              onMarkFileFailed(groupId, fileId, errorMessage);
              break;
            } // last try
            await wait(RETRY_DELAY_MS);
          }
        }
      }

      // Final update
      const data = res?.data?.data;
      if (data?.metadata) {
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(elapsed, "Elapsed time for upload");
        onUpdateProgress({
          groupId,
          fileId,
          progress: 100,
          elapsedTime: elapsed,
        });
      }
    },
    [onMarkFileFailed, onUpdateFile, onUpdateProgress]
  );

  const uploadFiles = useCallback(
    (groupId: string, groupName: string, files: File[]) => {
      onAddGroup(groupId, groupName);

      files.forEach((file) => {
        const fileId = generateUUID();
        const controller = new AbortController();

        onAddFile(groupId, {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          controller,

          file,
        });

        uploadFile({
          groupId,
          fileId,
          file,
          controller,
          startTime: Date.now(),
        });
      });
    },
    [onAddFile, onAddGroup, uploadFile]
  );

  const uploadByGroupId = useCallback(
    (
      groupId: string,
      onUploadFinish: (
        group: ReturnType<typeof getGroup>,
        state?: UploadStore,
        groupIndex?: number
      ) => void
    ) => {
      const group = getGroup(groupId);
      if (!group || group.files.length === 0) {
        return onUploadFinish(group);
      }

      onUpdateGroup(groupId, {
        status: "uploading",
        onUploadFinish,
      });

      group.files.forEach((file) => {
        if (file.status === "ready") {
          onUpdateFile(groupId, {
            id: file.id,
            status: "uploading",
            startTime: Date.now(),
          });

          uploadFile({
            groupId,
            fileId: file.id,
            file: file.file!,
            controller: file.controller!,
          });
        }
      });
    },
    [onUpdateGroup, onUpdateFile, uploadFile, getGroup]
  );

  const createAndAddFilesToGroup = useCallback(
    async (groupId: string, groupName: string, files: File[]) => {
      onAddGroup(groupId, groupName);
      files.map(async (file) => {
        const fileId = generateUUID();
        const controller = new AbortController();
        let previewUrl;
        try {
          const resp = await getMediaMetaData.extract(file);
          previewUrl = resp.thumbnail;
        } catch (err) {
          console.error("Failed to extract metadata for", file.name, err);
          // Optionally add failed file with status: "failed"
        }
        onAddFile(groupId, {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          controller,
          file,
          status: "ready",
          previewUrl,
        });
      });
    },
    [onAddGroup, onAddFile]
  );

  const resumeByFileIdGroupId = useCallback(
    async (groupId: string, fileId: string) => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/media/status?uploadId=${fileId}`
        );
        onResumeByFileIdGroupId(groupId, fileId, (_group, file) => {
          if (!file) return;

          uploadFile({
            groupId,
            fileId,
            file: file.file!,
            controller: file.controller!,
            startChunkIndex:
              res.data?.data?.uploadedChunks?.length ||
              file.uploadedChunkIndex ||
              0,
          });
        });
      } catch (error) {
        console.error("Error resuming file upload:", error);
        return;
      }
    },
    [onResumeByFileIdGroupId, uploadFile]
  );
  const pauseByFileIdGroupId = useCallback(
    (groupId: string, fileId: string) => {
      onPauseByFileIdGroupId(groupId, fileId, (_group, file) => {
        console.log("Pause File: ", { id: file.id });
      });
    },
    [onPauseByFileIdGroupId]
  );

  return {
    uploadFiles,
    onCancelFile,
    onCancelGroup,
    uploadByGroupId,
    createAndAddFilesToGroup,
    onRemoveFile,
    resumeByFileIdGroupId,
    pauseByFileIdGroupId,
  };
};
