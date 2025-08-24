/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAsset } from '@/types/Iupload';
import { WritableDraft } from 'immer';
import { useCallback } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
export const ABORT_REASONS = {
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
};
// Types
export type IStatus =
  | 'uploading'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'ready'
  | 'paused';

export type ProgressVariant =
  | 'gradient'
  | 'striped'
  | 'bar'
  | 'circle'
  | 'card'
  | 'list'
  | 'badge'
  | 'grid';

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
  previewUrl?: string;
  uploadedChunkIndex?: number;
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
  progressVariant?: ProgressVariant;

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
type IUpdateProgress = {
  groupId: string;
  fileId: string;
  progress: number;
  elapsedTime: number;
  data?: FileState['data'];
  status?: IStatus;
};
type IAddGroup = {
  groupId: string;
  groupName: string;
  progressVariant?: ProgressVariant;
  files?: FileState[];
  onUploadFinish?: GroupState['onUploadFinish'];
};
export type UploadStore = {
  groups: GroupState[];
  totalProgress: number;
  uploadedFiles: number;
  cancelledFiles: number;
  failedFiles: number;
  addGroup: (props: IAddGroup) => void;
  addFile: (groupId: string, props: IAddGroupFile) => void;
  updateFile: (
    groupId: string,
    props: Partial<FileState> & { id: string }
  ) => void;
  updateGroup: (groupId: string, props: Partial<GroupState>) => void;
  removeGroup: (groupId?: string) => void;
  removeFile: (groupId?: string, fileId?: string) => void;
  updateProgress: (props: IUpdateProgress) => void;
  markFileFailed: (groupId: string, fileId: string, error: string) => void;
  cancelFile: (groupId: string, fileId: string) => void;
  cancelGroup: (groupId: string) => void;
  resumeFile: (
    groupId: string,
    fileId: string,
    cb?: (gp?: GroupState, file?: FileState) => void
  ) => void;
  pauseFile: (
    groupId: string,
    fileId: string,
    cb?: (group: GroupState, file: FileState) => void
  ) => void;
  resetMediaUploadStore: () => void;
};

export type IAddGroupFile = {
  file: File;
  fileId: string;
  fileName: string;
  fileSize: number;
  controller: AbortController;
  status?: IStatus;
  previewUrl?: string;
};
// const getGroupProgress = () => {
//   if (!currentGroup || currentGroup.files.length === 0) return 0;
//   const total = currentGroup.files.reduce(
//     (sum, file) => sum + file.progress,
//     0
//   );
//   return total / currentGroup.files.length;
// };
const commonCalculations = (
  state: WritableDraft<UploadStore>,
  groupIndex: number,
  group: GroupState
) => {
  let totalCancelled = 0;
  let totalFailed = 0;
  const totalValidFiles = group.files.filter((f) => {
    if (f.status === 'cancelled') totalCancelled++;
    if (f.status === 'failed') totalFailed++;
    return (
      f.status === 'completed' ||
      f.status === 'uploading' ||
      f.status === 'paused'
    );
  });

  // group.progress =
  //   totalValidFiles.length > 0
  //     ? (group.completedCount / totalValidFiles.length) * 100
  //     : 0;
  const total = totalValidFiles.reduce((sum, file) => sum + file.progress, 0);
  group.progress = total > 0 ? total / totalValidFiles.length : 0;
  if (group.status === 'cancelled' || totalCancelled === group.totalFiles) {
    group.status = 'cancelled';
  } else if (totalFailed === group.totalFiles) {
    group.status = 'failed';
  } else if (totalCancelled + totalFailed === group.totalFiles) {
    group.status = 'failed';
  } else {
    group.status = group.progress === 100 ? 'completed' : 'uploading';
  }
  const activeFiles = group.files.filter((f) => f.status === 'uploading');
  group.remainingTime = activeFiles.length
    ? activeFiles.reduce((acc, f) => acc + f.remainingTime, 0) /
      activeFiles.length
    : 0;

  // group.remainingTime =
  //   group.files
  //     .filter((f) => f.status === "uploading")
  //     .reduce((acc, f) => acc + f.remainingTime, 0) /
  //   (group.totalFiles - group.completedCount || 1);
  state.groups[groupIndex] = group;

  const totalFiles = state.groups.flatMap((g) => g.files);
  state.totalProgress =
    (totalFiles.filter((f) => f.status === 'completed').length /
      totalFiles.length) *
    100;

  const groupStatus = group.status as IStatus;
  const isCompleted = groupStatus !== 'ready' && groupStatus !== 'uploading';

  if (isCompleted && group.onUploadFinish) {
    try {
      const safeGroup: GroupState = {
        ...group,
        onUploadFinish: undefined,
        files: group.files.map(({ controller, ...rest }) => rest),
        completedFiles: group.completedFiles
          .map(({ controller, file, ...rest }) => rest)
          .filter((f) => f.data != null),
        cancelledFiles: group.cancelledFiles.map(
          ({ controller, ...rest }) => rest
        ),
        failedFiles: group.failedFiles.map(({ controller, ...rest }) => rest),
      };
      group.onUploadFinish(safeGroup, state, groupIndex);
    } catch (err) {
      console.error('onUploadFinish failed:', err);
    }
  }
};

const removeFileCalculations = (
  state: WritableDraft<UploadStore>,
  fileId: string,
  group: GroupState
) => {
  let isFileFound = false;
  group.files = group.files.filter((f) => {
    if (f.id === fileId) {
      f.controller?.abort();

      // Cleanup heavy references
      f.file = undefined;
      f.controller = undefined;
      try {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      } catch (error) {}
      f.previewUrl = undefined;
      group.totalFiles--;
      isFileFound = true;
      return false;
    }
    return true;
  });
  if (group.files.length === 0) {
    state.groups = state.groups.filter((g) => g.id !== group.id);

    return null;
  }
  if (isFileFound) {
    group.completedFiles = group.completedFiles.filter((f) => f.id !== fileId);
    group.failedFiles = group.failedFiles.filter((f) => f.id !== fileId);
    group.cancelledFiles = group.cancelledFiles.filter((f) => f.id !== fileId);
  }
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

export const useUploadResumeStore = create<UploadStore>()(
  immer((set, get) => ({
    groups: [],
    totalProgress: 0,
    uploadedFiles: 0,
    cancelledFiles: 0,
    failedFiles: 0,

    addGroup: ({
      groupId,
      groupName,
      files = [],
      onUploadFinish,
      progressVariant = 'grid',
    }) =>
      set((state) => {
        if (!state.groups.some((g) => g.id === groupId)) {
          state.groups.push({
            id: groupId,
            name: groupName,
            files,
            progress: 0,
            elapsedTime: 0,
            remainingTime: 0,
            startTime: Date.now(),
            completedCount: 0,
            totalFiles: files.length,
            cancelledCount: 0,
            failedCount: 0,
            completedFiles: [],
            cancelledFiles: [],
            failedFiles: [],
            status: 'ready',
            onUploadFinish,
            progressVariant,
          });
        }
      }),

    removeGroup: (groupId) =>
      set((state) => {
        if (!groupId) return;
        const groupIndex = state.groups.findIndex((g) => g.id === groupId);
        if (groupIndex != -1) state.groups.splice(groupIndex, 1);
      }),

    removeFile: (groupId, fileId) =>
      set((state) => {
        if (!groupId || !fileId) return;
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        const updatedGroup = removeFileCalculations(state, fileId, group);
        if (!updatedGroup) {
          return;
        }
        state.groups[groupIndex] = updatedGroup;
        commonCalculations(state, groupIndex, updatedGroup);
      }),

    addFile: (
      groupId,
      {
        fileId,
        fileName,
        fileSize,
        controller,
        file,
        previewUrl,
        status = 'uploading',
      }
    ) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        group.files.push({
          id: fileId,
          name: fileName,
          size: fileSize,
          file,
          type: file?.type || '',
          progress: 0,
          elapsedTime: 0,
          remainingTime: 0,
          startTime: Date.now(),
          status,
          controller,
          previewUrl,
        });
        group.totalFiles++;
        state.groups[groupIndex] = group;
        commonCalculations(state, groupIndex, group);
      }),

    updateFile: (groupId, props) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        const fileIndex = group.files.findIndex((f) => f.id === props.id);
        if (fileIndex === -1) return;
        group.files[fileIndex] = { ...group.files[fileIndex], ...props };
        commonCalculations(state, groupIndex, group);
      }),

    updateGroup: (groupId, props) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        state.groups[groupIndex] = { ...group, ...props };
        commonCalculations(state, groupIndex, state.groups[groupIndex]);
      }),

    updateProgress: ({
      groupId,
      fileId,
      progress,
      elapsedTime,
      data,
      status,
    }) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        const file = group.files.find((f) => f.id === fileId);
        if (!file || file.status !== 'uploading') return;
        file.progress = progress;
        file.elapsedTime = elapsedTime;
        file.remainingTime =
          progress > 0 ? ((100 - progress) / progress) * elapsedTime : 0;
        if (progress === 100) {
          file.status = 'completed';
          file.data = data;
          group.completedCount++;
          group.completedFiles.push(file);
          state.uploadedFiles++;
        }
        commonCalculations(state, groupIndex, group);
      }),

    markFileFailed: (groupId, fileId, error) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        const file = group.files.find((f) => f.id === fileId);
        if (!file || file.status === 'failed') return;
        file.status = 'failed';
        file.error = error;
        group.failedCount++;
        group.failedFiles.push(file);
        state.failedFiles++;
        commonCalculations(state, groupIndex, group);
      }),

    cancelFile: (groupId, fileId) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        const file = group.files.find((f) => f.id === fileId);
        if (!file || file.status === 'cancelled') return;
        file.controller?.abort(ABORT_REASONS.CANCELLED);
        file.status = 'cancelled';

        // Cleanup memory-heavy references
        file.file = undefined;
        file.controller = undefined;
        // group.totalFiles--;
        group.cancelledCount++;
        group.cancelledFiles.push(file);
        state.cancelledFiles++;
        commonCalculations(state, groupIndex, group);
      }),

    cancelGroup: (groupId) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);
        if (!group) return;
        group.files.forEach((file) => {
          if (file.status !== 'cancelled') {
            file.controller?.abort(ABORT_REASONS.CANCELLED);
            file.status = 'cancelled';

            // Cleanup memory-heavy references
            file.file = undefined;
            file.controller = undefined;
            // group.totalFiles--;
            group.cancelledCount++;
            group.cancelledFiles.push(file);
            state.cancelledFiles++;
          }
        });
        group.status = 'cancelled';
        commonCalculations(state, groupIndex, group);
      }),
    pauseFile: (
      groupId: string,
      fileId: string,
      cb?: (group: GroupState, file: FileState) => void
    ) =>
      set((state) => {
        const { group, groupIndex } = getGroupIfExist(state, groupId);

        if (!group) return;
        const fileIndex = group.files.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) return;
        const foundFile = group.files[fileIndex];
        if (foundFile.status != 'uploading') return;
        foundFile.controller?.abort(ABORT_REASONS.PAUSED);
        foundFile.status = 'paused'; // mark for resume
        foundFile.controller = undefined;
        group.files[fileIndex] = { ...group.files[fileIndex], ...foundFile };
        commonCalculations(state, groupIndex, group);
        cb?.(group, foundFile);
      }),

    resumeFile: (
      groupId: string,
      fileId: string,
      cb?: (gp?: GroupState, file?: FileState) => void
    ) =>
      set((state) => {
        const newController = new AbortController();
        const { group, groupIndex } = getGroupIfExist(state, groupId);

        if (!group) return;
        const fileIndex = group.files.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) return;
        const foundFile = group.files[fileIndex];
        if (foundFile.status !== 'paused') return;
        foundFile.controller = newController;
        foundFile.status = 'uploading'; // mark for resume
        foundFile.startTime = Date.now();
        group.files[fileIndex] = { ...group.files[fileIndex], ...foundFile };
        commonCalculations(state, groupIndex, group);

        // You need to provide a way to restart uploadFile()
        // if (file.file) {
        //   uploadFile(groupId, fileId, file.file, newController);
        // }
        cb?.(
          get().groups.find((g) => g.id === groupId),
          foundFile
        );
      }),
    resetMediaUploadStore() {
      set((state) => {
        state.groups = [];
        state.totalProgress = 0;
        state.uploadedFiles = 0;
        state.cancelledFiles = 0;
        state.failedFiles = 0;
      });
    },
  }))
);
// Basic state selectors
export const useUploadGroups = () =>
  useUploadResumeStore((state) => state.groups);

export const useTotalProgress = () =>
  useUploadResumeStore((state) => state.totalProgress);

export const useUploadedFiles = () =>
  useUploadResumeStore((state) => state.uploadedFiles);

export const useCancelledFiles = () =>
  useUploadResumeStore((state) => state.cancelledFiles);

export const useFailedFiles = () =>
  useUploadResumeStore((state) => state.failedFiles);

// Derived state selectors
export const useTotalFiles = () => {
  const groups = useUploadGroups();
  return groups.reduce((acc, group) => acc + group.totalFiles, 0);
};

export const useTotalGroups = () => {
  const groups = useUploadGroups();
  return groups.length;
};

// Utility selectors
export const useGetGroupById = () => {
  const groups = useUploadGroups();
  return useCallback((id: string) => groups.find((g) => g.id === id), [groups]);
};

export const useGetFileById = () => {
  const groups = useUploadGroups();
  return useCallback(
    (groupId: string, fileId: string) => {
      const group = groups.find((g) => g.id === groupId);
      return group?.files.find((f) => f.id === fileId);
    },
    [groups]
  );
};

export const useGetGroupIndexById = () => {
  const groups = useUploadGroups();
  return useCallback(
    (id: string) => groups.findIndex((g) => g.id === id),
    [groups]
  );
};

export const useGetFileIndexById = () => {
  const groups = useUploadGroups();
  return useCallback(
    (groupId: string, fileId: string) => {
      const group = groups.find((g) => g.id === groupId);
      return group?.files.findIndex((f) => f.id === fileId);
    },
    [groups]
  );
};

// export const useGetGroupIfExist = (id: string) => {
//   const groups = useUploadGroups();
//   return useCallback(
//     (groupId: string) => getGroupIfExist({ groups }, groupId),
//     [groups]
//   );
// };

export const useGetGroupFilesById = () => {
  const groups = useUploadGroups();
  return useCallback(
    (id: string) => groups.find((g) => g.id === id)?.files || [],
    [groups]
  );
};
export const getGroupById = (id: string) =>
  useUploadResumeStore.getState().groups.find((g) => g.id === id);

export const useStoreUploaderActions = () => ({
  onResumeByFileIdGroupId: useUploadResumeStore((state) => state.resumeFile),
  onPauseByFileIdGroupId: useUploadResumeStore((state) => state.pauseFile),
  onAddFile: useUploadResumeStore((state) => state.addFile),
  onAddGroup: useUploadResumeStore((state) => state.addGroup),
  onUpdateGroup: useUploadResumeStore((state) => state.updateGroup),
  onRemoveFile: useUploadResumeStore((state) => state.removeFile),
  onRemoveGroupById: useUploadResumeStore((state) => state.removeGroup),
  onUpdateFile: useUploadResumeStore((state) => state.updateFile),
  onUpdateProgress: useUploadResumeStore((state) => state.updateProgress),
  onMarkFileFailed: useUploadResumeStore((state) => state.markFileFailed),
  onCancelFile: useUploadResumeStore((state) => state.cancelFile),
  onCancelGroup: useUploadResumeStore((state) => state.cancelGroup),
  onResetUploadStore: useUploadResumeStore(
    (state) => state.resetMediaUploadStore
  ),
});
