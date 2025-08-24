import { useFileUploadResume } from '@/hooks/use-uploader-resume';
import {
  useGetGroupById,
  useStoreUploaderActions,
} from '@/store/useUploadStoreResume';
import { PlusCircle, Trash } from 'lucide-react';
import React from 'react';
import { DropzoneInput } from './DropZoneInput';

// ---- Helpers ----
const formatBytes = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// ---- Progress Variants ----
const LinearBarProgress = ({ file }: any) => (
  <div className="w-full">
    <div className="flex justify-between text-xs text-gray-300 mb-1">
      <span>{file.name}</span>
      <span>{Math.round(file.progress)}%</span>
    </div>
    <div className="w-full bg-gray-900 rounded h-2">
      <div
        className={`h-2 rounded ${
          file.status === 'failed'
            ? 'bg-red-500'
            : file.status === 'completed'
              ? 'bg-green-500'
              : 'bg-blue-500'
        }`}
        style={{ width: `${file.progress}%` }}
      />
    </div>
  </div>
);

const CircularProgress = ({ file }: any) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 transform -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="gray"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={
            file.status === 'failed'
              ? 'red'
              : file.status === 'completed'
                ? 'green'
                : 'blue'
          }
          strokeWidth="4"
          fill="none"
          strokeDasharray={2 * Math.PI * 28}
          strokeDashoffset={
            2 * Math.PI * 28 - (file.progress / 100) * 2 * Math.PI * 28
          }
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {Math.round(file.progress)}%
      </span>
    </div>
    <p className="text-xs truncate w-20 text-center">{file.name}</p>
  </div>
);

const CardStyleProgress = ({ file }: any) => (
  <div className="p-4 rounded-lg shadow  flex gap-3 items-center">
    <img
      src={file.previewUrl}
      alt={file.name}
      className="w-12 h-12 rounded object-cover"
    />
    <div className="flex-1">
      <p className="text-sm font-medium truncate">{file.name}</p>
      <p className="text-xs text-gray-300">{formatBytes(file.size)}</p>
      <div className="w-full  rounded h-1 mt-2">
        <div
          className={`h-1 rounded ${
            file.status === 'failed'
              ? 'bg-red-500'
              : file.status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${file.progress}%` }}
        />
      </div>
    </div>
  </div>
);

const ListStyleProgress = ({ file }: any) => (
  <div className="grid grid-cols-3 text-sm items-center py-2 border-b">
    <span className="truncate">{file.name}</span>
    <span>{Math.round(file.progress)}%</span>
    <span className="text-xs text-gray-400">{file.status}</span>
  </div>
);

const BadgeProgress = ({ file }: any) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-medium ${
      file.status === 'failed'
        ? 'bg-red-100 text-red-700'
        : file.status === 'completed'
          ? 'bg-green-100 text-green-700'
          : 'bg-blue-100 text-blue-700'
    }`}
  >
    {file.name} • {Math.round(file.progress)}%
  </span>
);

type ProgressVariant =
  | 'gradient'
  | 'striped'
  | 'bar'
  | 'circle'
  | 'card'
  | 'list'
  | 'badge'
  | 'grid';

interface UploadProgressProps {
  progress: number; // 0-100
  variant?: ProgressVariant;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  variant = 'bar',
}) => {
  let roundProgress = Math.round(progress);
  if (roundProgress > 100) {
    roundProgress = 100;
  }
  switch (variant) {
    case 'gradient':
      return (
        <div className="w-full bg-foreground/25 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-[10px] text-white flex items-center justify-end pr-1"
            style={{ width: `${roundProgress}%` }}
          >
            {roundProgress}%
          </div>
        </div>
      );

    case 'circle':
      return (
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#3b82f6 ${roundProgress * 3.6}deg, #e5e7eb 0deg)`,
            }}
          />
          <div className="absolute inset-1 flex items-center justify-center rounded-full bg-white text-xs font-semibold">
            {roundProgress}%
          </div>
        </div>
      );

    case 'striped':
      return (
        <div className="w-full bg-foreground/25 rounded h-2 overflow-hidden">
          <div
            className="h-2 bg-blue-500 animate-[progress-stripes_1s_linear_infinite]"
            style={{ width: `${roundProgress}%`, backgroundSize: '20px 20px' }}
          />
          <style>{`
            @keyframes progress-stripes {
              0% { background-position: 0 0; }
              100% { background-position: 20px 0; }
            }
          `}</style>
        </div>
      );

    case 'bar':
    default:
      return (
        <div className="w-full  rounded-full h-2">
          <div
            className="h-2 bg-blue-500 rounded-full"
            style={{ width: `${roundProgress}%` }}
          />
        </div>
      );
  }
};
function GridCircularProgress({
  progress,
  size = 50,
  stroke = 4,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  let pgrs = Math.round(progress);
  if (pgrs > 100) {
    pgrs = 100;
  }

  return (
    <svg width={size} height={size} className="transform ">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="white"
        strokeOpacity={0.3}
        strokeWidth={stroke}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="white"
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-300"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
      >
        {pgrs}%
      </text>
    </svg>
  );
}

// ---- Main Component ----
export const UploadingProgress = ({
  progressVariant = 'bar', // bar | circle | card | list | badge
  groupId,
}: {
  progressVariant?: ProgressVariant;
  groupId?: string; // Optional, for future use
}) => {
  const getGroup = useGetGroupById();
  const { onRemoveFile } = useStoreUploaderActions();
  const { addMoreFilesToGroup } = useFileUploadResume();
  const currentGroup = groupId ? getGroup(groupId) : null;

  if (!currentGroup) return null;
  const progressUi = currentGroup.progressVariant || progressVariant;
  const renderProgress = (file: any) => {
    switch (progressUi) {
      case 'circle':
        return <CircularProgress file={file} />;
      case 'card':
        return <CardStyleProgress file={file} />;
      case 'list':
        return <ListStyleProgress file={file} />;
      case 'badge':
        return <BadgeProgress file={file} />;
      case 'bar':
        return <LinearBarProgress file={file} />;
      case 'grid':
        return (
          <div
            key={file.id}
            className="relative group rounded-xl overflow-hidden shadow-md border   h-20 w-20 "
          >
            {/* Image */}
            <img
              src={file.url || file.previewUrl}
              alt="media"
              className=" h-30 w-auto object-cover"
            />

            {/* Circular Progress */}
            {file?.status !== 'cancelled' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <GridCircularProgress progress={file.progress} />
              </div>
            )}

            {/* Actions */}
            <div className="absolute top-2 right-2  transition">
              <button
                className=" rounded-full p-1 shadow text-white/70 bg-gray-600"
                onClick={() => onRemoveFile(groupId!, file.id)}
              >
                <Trash size={16} />
              </button>
            </div>
            {/* Dropdown Menu */}
            {/* <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-5 w-5 rounded-full "
                  >
                    <MoreVertical className="h-2 w-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                  // onClick={() => setSelected(item)}
                  >
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                  // onClick={() => alert('Download ' + item.id)}
                  >
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    // onClick={() =>
                    //   setMedia(media.filter((m) => m.id !== item.id))
                    // }
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div> */}
          </div>
        );
      default:
        return (
          <UploadProgress
            progress={currentGroup?.progress as number}
            variant={progressUi}
          />
        );
    }
  };
  return (
    <div
      className={
        progressUi === 'circle' || progressUi === 'grid'
          ? 'flex items-center justify-center gap-1 flex-wrap'
          : 'space-y-3'
      }
    >
      {currentGroup.files.map((file) => (
        <div key={file.id}>{renderProgress(file)}</div>
      ))}
      {currentGroup.status === 'ready' ? (
        <DropzoneInput
          onFiles={(files) => addMoreFilesToGroup(groupId!, files)}
          className="bg-transparent  h-full"
        >
          <PlusCircle />
        </DropzoneInput>
      ) : null}
    </div>
  );
};
