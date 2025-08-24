import { useFileUploadResume } from '@/hooks/use-uploader-resume';
import { generateUUID } from '@/lib';
import {
  GroupState,
  UploadStore,
  useGetGroupById,
} from '@/store/useUploadStoreResume';
import { useCallback, useState } from 'react';
import ButtonLoader from './ButtonLoader';
import { DropzoneInput } from './DropZoneInput';

type ProgressVariant =
  | 'gradient'
  | 'striped'
  | 'bar'
  | 'circle'
  | 'card'
  | 'list'
  | 'badge'
  | 'grid';

// ---- Main Component ----
export const MediaUploaderResume = ({
  progressVariant = 'bar', // bar | circle | card | list | badge
  groupId = generateUUID(),
  onUploadFinish,
  children,
}: {
  progressVariant?: ProgressVariant;
  groupId?: string; // Optional, for future use
  onUploadFinish: (
    group?: GroupState,
    state?: UploadStore,
    groupIndex?: number
  ) => void;
  children?: React.ReactNode;
}) => {
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const { createAndAddFilesToGroup, uploadByGroupId, addMoreFilesToGroup } =
    useFileUploadResume();

  const getGroup = useGetGroupById();

  const handleFiles = useCallback(
    (acceptedFiles: File[]) => {
      setCurrentGroupId(groupId);
      createAndAddFilesToGroup(
        groupId,
        'My Upload',
        acceptedFiles,
        progressVariant
      );
    },
    [groupId, createAndAddFilesToGroup, progressVariant]
  );

  const currentGroup = currentGroupId ? getGroup(currentGroupId) : null;
  return (
    <div className="p-6 border rounded-xl shadow space-y-4  mx-auto">
      {currentGroup?.status !== 'uploading' && (
        <DropzoneInput onFiles={handleFiles}>
          {/* Customizable content */}
          <p className="text-foreground">📂 Drop or click to add files</p>
        </DropzoneInput>
      )}
      {currentGroup?.status === 'ready' && (
        <ButtonLoader onClick={() => uploadByGroupId(groupId, onUploadFinish)}>
          Upload
        </ButtonLoader>
      )}
      {children}
    </div>
  );
};
