'use client';

import { cn } from '@/lib/utils';
import {
  type UseSupabaseUploadReturn,
  type UploadFile,
  useSupabaseUpload,
} from '@/hooks/use-supabase-upload'; // Adjusted path
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  File as FileIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react'; // Renamed File to FileIcon
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
} from 'react';

export const formatBytes = (
  bytes: number,
  decimals = 2,
  size?: 'bytes' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB',
) => {
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  if (bytes === 0 || bytes === undefined)
    return size !== undefined ? `0 ${size}` : '0 bytes';
  const i =
    size !== undefined
      ? sizes.indexOf(size)
      : Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Update context type: Remove 'open' from Omit, as it IS provided.
// Also remove getRootProps/getInputProps as they are handled by the main Dropzone component.
type DropzoneContextType = Omit<
  UseSupabaseUploadReturn,
  'getRootProps' | 'getInputProps'
>;

const DropzoneContext = createContext<DropzoneContextType | undefined>(
  undefined,
);

// Props should accept the full return type of the hook
type DropzoneProps = UseSupabaseUploadReturn & {
  className?: string;
};

const Dropzone = ({
  className,
  children,
  getRootProps,
  getInputProps,
  open, // Extract open to use it
  ...restProps
}: PropsWithChildren<DropzoneProps>) => {
  const { isSuccess, isDragActive, isDragReject, errors, files } = restProps;

  const hasFileErrors = files.some((file) => file.errors.length > 0);
  const hasUploadErrors = errors.length > 0;

  // Determine invalid state based on drag state, file errors, or upload errors
  const isInvalid =
    (isDragActive && isDragReject) ||
    (hasFileErrors && !isSuccess) || // Show invalid if files have errors before upload completes
    hasUploadErrors; // Show invalid if upload resulted in errors

  return (
    <DropzoneContext.Provider value={{ ...restProps, open }}>
      {/* Main Dropzone container */}
      <div
        {...getRootProps({
          className: cn(
            'border-2 border-gray-300 rounded-lg p-6 text-center bg-card transition-colors duration-300 text-foreground cursor-pointer',
            className,
            isSuccess ? 'border-solid border-primary' : 'border-dashed',
            isDragActive && !isDragReject && 'border-primary bg-primary/10',
            isInvalid && 'border-destructive bg-destructive/10',
          ),
          // Use the provided open function on click
          onClick: open,
        })}
      >
        {/* Hidden file input */}
        <input {...getInputProps()} />
        {/* Render children which contain the content */}
        {children}
      </div>
    </DropzoneContext.Provider>
  );
};

// Component to display the list of files, progress, and upload button
const DropzoneContent = ({ className }: { className?: string }) => {
  const {
    files,
    setFiles,
    onUpload,
    loading,
    successes,
    errors, // Upload errors
    maxFileSize,
    maxFiles,
    isSuccess,
  } = useDropzoneContext();

  const exceedMaxFiles = files.length > maxFiles;

  const handleRemoveFile = useCallback(
    (fileName: string, fileLastModified: number) => {
      // Revoke object URL before removing
      const fileToRemove = files.find(
        (f) => f.name === fileName && f.lastModified === fileLastModified,
      );
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      setFiles(
        files.filter(
          (file) =>
            !(file.name === fileName && file.lastModified === fileLastModified),
        ),
      );
    },
    [files, setFiles],
  );

  // Early return for overall success message
  if (isSuccess && files.length > 0 && errors.length === 0 && !loading) {
    return (
      <div className={cn('flex flex-col items-center gap-y-2', className)}>
        <CheckCircle size={20} className="text-primary" />
        <p className="text-primary text-sm">
          Successfully uploaded {successes.length} file
          {successes.length > 1 ? 's' : ''}
        </p>
        {/* Optionally add a button to clear/reset */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiles([])}
          className="mt-2"
        >
          Upload More
        </Button>
      </div>
    );
  }

  // Render list of files if any are present
  if (files.length > 0) {
    return (
      <div className={cn('flex flex-col w-full', className)}>
        {files.map((file, idx) => {
          const uploadError = errors.find((e) => e.name === file.name);
          const isSuccessfullyUploaded =
            successes.includes(file.name) && !uploadError;
          const hasFileValidationError = file.errors.length > 0;

          return (
            <div
              key={`${file.name}-${file.lastModified}-${idx}`}
              className="flex items-center gap-x-4 border-b py-2 first:mt-4 last:mb-4 last:border-b-0"
            >
              {/* File Preview/Icon */}
              {file.type.startsWith('image/') ? (
                <div className="h-10 w-10 rounded border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                  <FileIcon size={18} />
                </div>
              )}

              {/* File Name and Status */}
              <div className="shrink grow flex flex-col items-start truncate">
                <p title={file.name} className="text-sm truncate max-w-full">
                  {file.name}
                </p>
                {/* Display file validation errors first */}
                {hasFileValidationError ? (
                  <p className="text-xs text-destructive">
                    {file.errors
                      .map(
                        (e) =>
                          e.code === 'file-too-large'
                            ? `File is larger than ${formatBytes(maxFileSize)} (Size: ${formatBytes(file.size)})`
                            : e.code === 'file-invalid-type'
                              ? `Invalid file type.`
                              : e.message, // Fallback
                      )
                      .join(', ')}
                  </p>
                ) : (
                  <>
                    {' '}
                    {/* Wrap subsequent statuses in a fragment */}
                    {/* Display upload status/errors */}
                    {loading && !isSuccessfullyUploaded ? (
                      <p className="text-xs text-muted-foreground">
                        Uploading file...
                      </p>
                    ) : uploadError ? (
                      <p className="text-xs text-destructive">
                        Failed: {uploadError.message}
                      </p>
                    ) : isSuccessfullyUploaded ? (
                      <p className="text-xs text-primary">
                        Successfully uploaded
                      </p>
                    ) : (
                      /* Display file size if no errors/status */
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Remove Button - Show if not loading or successfully uploaded */}
              {!loading && !isSuccessfullyUploaded && (
                <Button
                  size="icon"
                  variant="ghost" // Use ghost variant for less emphasis
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveFile(file.name, file.lastModified)}
                >
                  <X size={16} />
                </Button>
              )}
              {/* Show loader only for the specific file being uploaded? (More complex state needed) */}
              {/* For now, loader is handled globally by the upload button */}
            </div>
          );
        })}

        {/* Max files warning */}
        {exceedMaxFiles && (
          <p className="text-sm text-left mt-2 text-destructive">
            You may upload only up to {maxFiles} file{maxFiles !== 1 ? 's' : ''}
            . Please remove {files.length - maxFiles} file
            {files.length - maxFiles > 1 ? 's' : ''}.
          </p>
        )}

        {/* Upload Button - Show if files exist and don't exceed max count */}
        {files.length > 0 && !exceedMaxFiles && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onUpload();
              }} // Stop propagation to prevent dropzone click
              // Disable if any file has validation errors or if loading
              disabled={files.some((file) => file.errors.length > 0) || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload {files.length} file{files.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }
  // Return null or Empty State if no files and not success
  return null;
};

// Component to display when no files are selected
const DropzoneEmptyState = ({ className }: { className?: string }) => {
  const { maxFiles, maxFileSize, open, isSuccess, files } =
    useDropzoneContext();

  // Don't show empty state if successfully uploaded or files are present
  if (isSuccess || files.length > 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-y-2 text-muted-foreground',
        className,
      )}
    >
      <Upload size={32} /> {/* Slightly larger icon */}
      <p className="text-sm font-medium text-foreground">
        Drag & drop or click to upload
      </p>
      <div className="flex flex-col items-center gap-y-1">
        <p className="text-xs">
          {maxFiles > 1 ? `Up to ${maxFiles} files. ` : ''}
          {maxFileSize !== Number.POSITIVE_INFINITY
            ? `Max ${formatBytes(maxFileSize)} per file.`
            : ''}
        </p>
      </div>
      {/* Remove the manual link, click is handled by the main div */}
    </div>
  );
};

// Hook to use the Dropzone context
const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error('useDropzoneContext must be used within a Dropzone');
  }

  return context;
};

export { Dropzone, DropzoneContent, DropzoneEmptyState, useDropzoneContext };
