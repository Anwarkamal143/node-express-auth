import { WritableDraft } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storeResetFns } from "./useGlobalStore";
type IStatus = "uploading" | "cancelled" | "completed" | "ready" | "failed";
// Types
export type FileState = {
  id: string;
  name: string;
  size: number;
  progress: number;
  elapsedTime: number;
  remainingTime: number;
  startTime: number;
  status: IStatus;
  error?: string;
  controller?: AbortController;
  file?: File;
  type: string;
  data?: IAsset;
  url?: string;
};

export type GroupState = {
  id: string;
  name: string;
  files: FileState[];
  progress: number;
  elapsedTime: number;
  remainingTime: number;
  startTime: number;
  completedCount: number;
  totalFiles: number;
  failedCount: number;
  cancelledCount: number;
  completedFiles: FileState[];
  failedFiles: FileState[];
  cancelledFiles: FileState[];
  status: IStatus;
  onUploadFinish?: (
    group: GroupState,
    state: UploadStore,
    groupIndex: number
  ) => void;
};
type IAddGroupFile = {
  file: File;
  fileId: string;
  fileName: string;
  fileSize: number;
  controller: AbortController;
  status?: IStatus;
  url?: string;
};
export type UploadStoreState = {
  groups: GroupState[];
  totalProgress: number;
  uploadedFiles: number;
  cancelledFiles: number;
  failedFiles: number;
};
export type UploadStoreActions = {
  addGroup: (
    groupId: string,
    groupName: string,
    files?: FileState[],
    onUploadFinish?: (
      group: GroupState,
      state: UploadStore,
      groupIndex: number
    ) => void
  ) => void;
  addFile: (groupId: string, props: IAddGroupFile) => void;
  updateFile: (groupId: string, props: Partial<FileState>) => void;
  updateGroup: (groupId: string, props: Partial<GroupState>) => void;
  removeGroup: (groupId?: string) => void;
  removeFile: (groupId?: string, fileId?: string) => void;
  updateProgress: (
    groupId: string,
    fileId: string,
    progress: number,
    elapsedTime: number,
    data?: FileState["data"],
    status?: IStatus
  ) => void;
  markFileFailed: (groupId: string, fileId: string, error: string) => void;
  cancelFile: (groupId: string, fileId: string) => void;
  cancelGroup: (groupId: string) => void;
};
export type UploadStore = UploadStoreState & UploadStoreActions;

const commonCalculations = (
  state: WritableDraft<UploadStore>,
  groupIndex: number,
  group: GroupState
) => {
  let totalCancelled = 0;
  let totalFailed = 0;
  const totalValidFiles = group.files.filter((f) => {
    totalCancelled =
      f.status === "cancelled" ? totalCancelled + 1 : totalCancelled;
    totalFailed = f.status === "failed" ? totalFailed + 1 : totalFailed;
    return f.status === "completed" || f.status === "uploading";
  });

  group.progress = (group.completedCount / totalValidFiles.length) * 100 || 0;
  if (group.status === "cancelled" || totalCancelled === group.totalFiles) {
    group.status = "cancelled";
  } else if (totalFailed === group.totalFiles) {
    group.status = "failed";
  } else if (totalCancelled + totalFailed === group.totalFiles) {
    group.status = "failed";
  } else {
    group.status = group.progress === 100 ? "completed" : "uploading";
  }
  group.remainingTime =
    group.files
      .filter((f) => f.status === "uploading")
      .reduce((acc, f) => acc + f.remainingTime, 0) /
    (group.totalFiles - group.completedCount || 1);
  state.groups[groupIndex] = group;
  // Update total progress
  const totalFiles = state.groups.flatMap((g) => g.files);
  state.totalProgress =
    (totalFiles.filter((f) => f.status === "completed").length /
      totalFiles.length) *
    100;
  const groupStatus = group.status as IStatus;
  const isCompleted = groupStatus !== "ready" && groupStatus !== "uploading";

  if (isCompleted) {
    const { onUploadFinish, ...rest } = JSON.parse(
      `${JSON.stringify(group)}`
    ) as GroupState;

    group.onUploadFinish?.(
      {
        ...rest,
        files: rest.files.map((f) => {
          const { controller, ...rest } = f;
          return rest;
        }),
        completedFiles: rest.completedFiles
          .map((f) => {
            const { controller, file, ...rest } = f;
            return rest;
          })
          .filter((f) => f.data != null),
      },
      state,
      groupIndex
    );
  }
};

const removeFileCalculations = (
  state: WritableDraft<UploadStore>,
  fileId: string,
  group: GroupState
) => {
  let isFileFound = false;
  const files = group.files.filter((f) => {
    if (f.id === fileId) {
      f.controller?.abort();
      group.totalFiles -= 1;
      isFileFound = true;
    }

    return f.id !== fileId;
  });
  if (isFileFound) {
    const completedFiles = group.completedFiles.filter((f) => {
      if (f.id === fileId) {
        group.completedCount -= 1;
      }

      return f.id !== fileId;
    });
    const failedFiles = group.failedFiles.filter((f) => {
      if (f.id === fileId) {
        group.failedCount -= 1;
      }

      return f.id !== fileId;
    });
    const cancelledFiles = group.cancelledFiles.filter((f) => {
      if (f.id === fileId) {
        group.cancelledCount -= 1;
      }

      return f.id !== fileId;
    });
    group.completedFiles = completedFiles;
    group.failedFiles = failedFiles;
    group.cancelledFiles = cancelledFiles;
  }
  group.files = files;
  return group;
};
const getGroupIfExist = (
  state: WritableDraft<UploadStore>,
  groupId: string
) => {
  const groupIndex = state.groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) return { group: null, groupIndex: -1 };
  return { group: state.groups[groupIndex], groupIndex };
};
const INITIAL_STATE: UploadStoreState = {
  groups: [],
  failedFiles: 0,
  totalProgress: 0,
  uploadedFiles: 0,
  cancelledFiles: 0,
};
export const useUploadStore = create<UploadStore>()(
  immer((set) => {
    storeResetFns.add(() => set(INITIAL_STATE));

    return {
      groups: [],
      totalProgress: 0,
      uploadedFiles: 0,
      cancelledFiles: 0,
      failedFiles: 0,

      addGroup: (groupId, groupName, files = [], onUploadFinish) =>
        set((state) => {
          if (!state.groups.find((g) => g.id === groupId)) {
            state.groups.push({
              id: groupId,
              name: groupName,
              files: files,
              progress: 0,
              elapsedTime: 0,
              remainingTime: 0,
              startTime: Date.now(),
              completedCount: 0,
              totalFiles: 0,
              cancelledCount: 0,
              failedCount: 0,
              completedFiles: [],
              cancelledFiles: [],
              failedFiles: [],
              status: "ready",
              onUploadFinish,
            });
          }
        }),
      removeGroup: (groupId) =>
        set((state) => {
          if (groupId) {
            const groupIndex = state.groups.findIndex((g) => g.id === groupId);
            if (groupIndex === -1) return;
            state.groups.splice(groupIndex, 1);
          }
        }),
      removeFile: (groupId, fileId) =>
        set((state) => {
          if (groupId && fileId) {
            const groupIndex = state.groups.findIndex((g) => g.id === groupId);
            if (groupIndex === -1) return;
            const group = state.groups[groupIndex];
            const updatedGroup = removeFileCalculations(state, fileId, group);
            state.groups[groupIndex] = updatedGroup;
            const stateGroup = { ...state.groups[groupIndex] };
            commonCalculations(state, groupIndex, stateGroup);
          }
        }),
      addFile: (
        groupId,
        {
          fileId,
          fileName,
          fileSize,
          controller,
          file,
          url,
          status = "uploading",
        }
      ) =>
        set((state) => {
          const { group, groupIndex } = getGroupIfExist(state, groupId);
          if (group) {
            group.files.push({
              id: fileId,
              name: fileName,
              size: fileSize,
              file: file,
              type: file.type,
              progress: 0,
              elapsedTime: 0,
              remainingTime: 0,
              startTime: Date.now(),
              status,
              controller,
              url,
            });
            group.totalFiles += 1;
            state.groups[groupIndex] = group;
            const updatedGroup = { ...state.groups[groupIndex] };
            commonCalculations(state, groupIndex, updatedGroup);
          }
        }),
      updateFile: (groupId, file) =>
        set((state) => {
          const { group, groupIndex } = getGroupIfExist(state, groupId);
          if (group) {
            const files = group.files.map((f) => ({
              ...f,
              ...file,
            }));
            group.files = files;
            state.groups[groupIndex] = group;
            const updatedGroup = { ...state.groups[groupIndex] };
            commonCalculations(state, groupIndex, updatedGroup);
          }
        }),
      updateGroup: (groupId, group) =>
        set((state) => {
          const { group: sGroup, groupIndex } = getGroupIfExist(state, groupId);
          if (sGroup) {
            state.groups[groupIndex] = { ...sGroup, ...group };

            const updatedGroup = { ...state.groups[groupIndex] };
            commonCalculations(state, groupIndex, updatedGroup);
          }
        }),

      updateProgress: (groupId, fileId, progress, elapsedTime, data, status) =>
        set((state) => {
          const { group, groupIndex } = getGroupIfExist(state, groupId);
          if (!group) return;
          const fileIndex = group.files.findIndex((f) => f.id === fileId);
          const file = group.files[fileIndex];
          if (!file || file.status !== "uploading") return;

          file.progress = progress;
          file.elapsedTime = elapsedTime;
          file.remainingTime =
            progress > 0 ? ((100 - progress) / progress) * elapsedTime : 0;

          if (progress === 100 && !status) {
            file.status = "completed";
            file.data = data;
            group.completedCount += 1;
            group.completedFiles.push(file);
            state.uploadedFiles += 1;
          }
          group.files[fileIndex] = file;
          state.groups[groupIndex] = group;
          const updatedGroup = { ...state.groups[groupIndex] };
          commonCalculations(state, groupIndex, updatedGroup);
        }),

      markFileFailed: (groupId, fileId, error) =>
        set((state) => {
          const { group, groupIndex } = getGroupIfExist(state, groupId);
          if (!group) return;
          const fileIndex = group.files.findIndex((f) => f.id === fileId);
          const file = group.files[fileIndex];
          if (file && file.status !== "failed") {
            file.status = "failed";
            file.error = error;
            group.failedCount += 1;
            group.failedFiles.push(file);
            state.failedFiles += 1;
            group.files[fileIndex] = file;
          }
          state.groups[groupIndex] = group;
          const updatedGroup = { ...state.groups[groupIndex] };
          commonCalculations(state, groupIndex, updatedGroup);
        }),

      cancelFile: (groupId, fileId) =>
        set((state) => {
          const { group, groupIndex } = getGroupIfExist(state, groupId);
          if (!group) return;

          const fileIndex = group.files.findIndex((f) => f.id === fileId);
          const file = group.files[fileIndex];
          if (file && file.status !== "cancelled") {
            file.controller?.abort();
            file.status = "cancelled";
            group.cancelledCount += 1;
            group.files[fileIndex] = file;
            state.cancelledFiles += 1;
          }
          state.groups[groupIndex] = group;
          const updatedGroup = { ...state.groups[groupIndex] };
          commonCalculations(state, groupIndex, updatedGroup);
        }),

      cancelGroup: (groupId) =>
        set((state) => {
          const { group, groupIndex } = getGroupIfExist(state, groupId);
          if (!group) return;
          group.files.forEach((file) => {
            if (file.status !== "cancelled") {
              file.controller?.abort();
              file.status = "cancelled";
              group.cancelledCount += 1;
              group.cancelledFiles.push(file);
              state.cancelledFiles += 1;
            }
          });
          group.status = "cancelled";
          state.groups[groupIndex] = group;
          const updatedGroup = { ...state.groups[groupIndex] };
          commonCalculations(state, groupIndex, updatedGroup);
        }),
    };
  })
);

export const useFileUploadGroups = () =>
  useUploadStore((state) => {
    return state.groups;
  });
export const useFileUploadGroupById = (id: string) =>
  useUploadStore((state) => {
    return state.groups.find((g) => g.id === id);
  });
export const useFileUploadGroupFilesById = (id: string) =>
  useUploadStore((state) => {
    return state.groups.find((g) => g.id === id)?.files;
  });
export const getFileUploadGroupById = (id: string) =>
  useUploadStore.getState().groups.find((g) => g.id === id);
export const useRemoveGroupById = () =>
  useUploadStore((state) => state.removeGroup);
