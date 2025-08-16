import { useFileUploadResume } from "@/hooks/use-uploader-resume";
import { generateUUID } from "@/lib";
import { useGetGroupById } from "@/store/useUploadStoreResume";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
export const MediaUploaderResume = () => {
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  //   const groups = useFileUploadGroups();
  const {
    createAndAddFilesToGroup,
    uploadByGroupId,
    onCancelFile,
    onRemoveFile,
    resumeByFileIdGroupId,
    pauseByFileIdGroupId,
  } = useFileUploadResume();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const groupId = generateUUID();
    setCurrentGroupId(groupId);
    createAndAddFilesToGroup(groupId, "My Upload", acceptedFiles);
  }, []);
  const getGroup = useGetGroupById();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const currentGroup = currentGroupId ? getGroup(currentGroupId) : null;

  const handleUpload = () => {
    if (!currentGroupId) return;
    uploadByGroupId(currentGroupId, (group) => {
      console.log("Upload finished for group:", group?.id);
    });
  };

  const formatBytes = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
  };
  console.log(currentGroup, "currentGroup");
  return (
    <div className="p-6 border rounded-xl bg-white shadow space-y-4 max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 cursor-pointer text-center ${
          isDragActive ? "bg-gray-100" : "bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-500">
          Drag & drop files here, or click to select
        </p>
      </div>

      {currentGroup && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold">Group Progress</h4>
              <span className="text-xs text-gray-500">
                {Math.round(currentGroup.progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded h-1">
              <div
                className={`h-1  rounded  ${
                  currentGroup.status === "failed"
                    ? "bg-red-500"
                    : currentGroup.status === "completed"
                    ? "bg-green-500"
                    : currentGroup.status === "uploading"
                    ? "bg-blue-500"
                    : currentGroup.status === "paused"
                    ? "bg-yellow-500"
                    : ""
                }`}
                style={{ width: `${currentGroup.progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Files to upload</h3>
            <button
              onClick={handleUpload}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Upload
            </button>
          </div>

          {currentGroup.files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between border rounded-lg p-3 shadow-sm bg-gray-50 relative rounded-t-none`}
            >
              <div
                className={` absolute top-0 left-0 border-t-2 ${
                  file.status === "failed"
                    ? "border-t-red-500"
                    : file.status === "completed"
                    ? "border-t-green-500"
                    : file.status === "paused"
                    ? "border-t-yellow-500"
                    : "border-t-blue-500"
                }`}
                style={{ width: `${file.progress}%` }}
              />
              <div className={`flex items-center gap-3 w-2/3 overflow-hidden `}>
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div>
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex-1 px-4">
                  <div className="w-full bg-gray-200 rounded h-1">
                    <div
                      className={`h-1 rounded ${
                        file.status === "failed"
                          ? "bg-red-500"
                          : file.status === "completed"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {file.status} • {Math.round(file.progress)}%
                  </p>
                </div>
                <div className="flex gap-2 justify-center mt-1">
                  {file.status === "uploading" && (
                    <button
                      onClick={() =>
                        pauseByFileIdGroupId(currentGroup.id, file.id)
                      }
                      className="text-yellow-500 text-xs hover:underline"
                    >
                      Pause
                    </button>
                  )}
                  {file.status === "paused" && (
                    <button
                      onClick={() =>
                        resumeByFileIdGroupId(currentGroup.id, file.id)
                      }
                      className="text-green-500 text-xs hover:underline"
                    >
                      Resume
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    {file.status === "uploading" && (
                      <button
                        onClick={() => onCancelFile(currentGroup.id, file.id)}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Cancel
                      </button>
                    )}

                    {file.status === "failed" && (
                      <button
                        onClick={() => onRemoveFile(currentGroup.id, file.id)}
                        className="text-gray-500 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
