'use client';

import { cn } from '@/lib/utils';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

type DropzoneInputProps = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode; // custom UI inside the dropzone
};

export const DropzoneInput = ({
  onFiles,
  multiple = true,
  className = '',
  children,
}: DropzoneInputProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFiles(acceptedFiles);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        `border-2 border-dashed rounded-xl  cursor-pointer text-center transition flex items-center justify-center p-2`,
        isDragActive ? 'bg-foreground/20' : 'bg-foreground/25',
        className
      )}
    >
      <input {...getInputProps()} />
      {!children ? (
        <p className="text-foreground">
          Drag & drop files here, or click to select
        </p>
      ) : (
        children
      )}
    </div>
  );
};
