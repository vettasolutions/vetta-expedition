// Note: This hook is adapted from the Supabase UI documentation.
// It requires `react-dropzone` and `@supabase/supabase-js` (or `@supabase/ssr` for client usage)

import { createClient } from '@/lib/supabase/client'; // Assuming client setup is here
import { useCallback, useState, useRef, useEffect } from 'react';
import {
  useDropzone,
  type Accept,
  type FileRejection,
  type FileError,
  type DropzoneState,
} from 'react-dropzone';

export type UseSupabaseUploadOptions = {
  bucketName: string;
  path?: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  onSuccess?: (results: { path: string; name: string }[]) => void; // Added name to success result
  onError?: (error: Error) => void;
};

export interface UploadFileError {
  code: string;
  message: string;
}

export interface UploadFile extends File {
  preview: string;
  errors: UploadFileError[]; // Use mutable type
}

// Explicitly define the properties we are adding or modifying from DropzoneState
export interface CustomDropzoneProperties {
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  loading: boolean;
  errors: { name: string; message: string }[]; // Errors specifically from upload attempts
  successes: string[]; // filenames of successful uploads
  isSuccess: boolean;
  onUpload: () => Promise<void>;
  inputRef: React.RefObject<HTMLInputElement>;
  maxFiles: number;
  maxFileSize: number;
}

// Combine DropzoneState with our custom properties
export type UseSupabaseUploadReturn = DropzoneState & CustomDropzoneProperties;

export const useSupabaseUpload = ({
  bucketName,
  path = '',
  maxFiles = 1,
  maxFileSize = 10 * 1000 * 1000, // Default 10MB
  allowedMimeTypes,
  onSuccess,
  onError,
}: UseSupabaseUploadOptions): UseSupabaseUploadReturn => {
  const supabase = createClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]); // Upload specific errors
  const [successes, setSuccesses] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const mappedNewFiles: UploadFile[] = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
          errors: [], // Initialize with empty mutable array
        }),
      );

      const mappedRejectedFiles: UploadFile[] = fileRejections.map(
        (rejection) =>
          Object.assign(rejection.file, {
            preview: URL.createObjectURL(rejection.file),
            // Map readonly FileError[] to mutable UploadFileError[]
            errors: rejection.errors.map(
              (error: FileError): UploadFileError => ({
                code: error.code,
                message: error.message,
              }),
            ),
          }),
      );

      // Combine accepted and rejected with errors for display
      const allProcessedFiles = [...mappedNewFiles, ...mappedRejectedFiles];

      // If maxFiles is 1, replace the current file
      if (maxFiles === 1) {
        // Clean up previous preview if replacing
        files.forEach((file) => URL.revokeObjectURL(file.preview));
        setFiles(allProcessedFiles.slice(0, 1));
      } else {
        setFiles((currentFiles) => {
          const updatedFiles = [...currentFiles, ...allProcessedFiles].slice(
            0,
            maxFiles,
          );
          // Clean up previews for files that were removed by slicing
          const removedFiles = currentFiles.filter(
            (cf) =>
              !updatedFiles.some(
                (uf) =>
                  uf.name === cf.name && uf.lastModified === cf.lastModified,
              ),
          );
          removedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
          return updatedFiles;
        });
      }
      setErrors([]); // Clear upload errors on new drop
      setSuccesses([]); // Clear successes on new drop
    },
    [maxFiles, files], // Add files dependency for cleanup logic
  );

  const accept: Accept | undefined = allowedMimeTypes
    ? allowedMimeTypes.reduce((acc, type) => {
        acc[type] = [];
        return acc;
      }, {} as Accept)
    : undefined;

  const dropzoneState = useDropzone({
    onDrop,
    accept,
    maxSize: maxFileSize,
    maxFiles,
    multiple: maxFiles > 1,
    disabled: loading,
    noClick: true, // Prevent default click behavior, manage via inputRef
    noKeyboard: true,
  });

  const onUpload = async () => {
    const validFiles = files.filter((f) => f.errors.length === 0);
    if (validFiles.length === 0) {
      console.log('No valid files to upload or files exceed limits.');
      return;
    }

    setLoading(true);
    setErrors([]);
    setSuccesses([]);

    const uploadPromises = validFiles.map(async (file) => {
      const filePath = `${path ? `${path}/` : ''}${file.name}`.replace(
        /\/\//g,
        '/',
      ); // Ensure single slash
      try {
        // Explicitly define expected success data shape
        type UploadSuccessData = { path: string };
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true, // Overwrite file if exists
          });

        if (error) {
          throw error;
        }

        // Ensure data and data.path exist
        if (!data?.path) {
          throw new Error('Upload succeeded but no path returned.');
        }

        // Cast data to expected shape on success
        return { data: data as UploadSuccessData, file };
      } catch (error: any) {
        console.error('Upload Error for file:', file.name, error);
        // Return file info along with error for granular feedback
        return { error, file };
      }
    });

    // Define the type for the resolved promise results
    type UploadResult =
      | { data: { path: string }; file: UploadFile }
      | { error: Error; file: UploadFile };
    const results: UploadResult[] = await Promise.all(uploadPromises);

    const successfulUploads = results
      .filter(
        (result): result is { data: { path: string }; file: UploadFile } =>
          'data' in result && !!result.data,
      )
      .map((result) => ({ path: result.data.path, name: result.file.name }));

    const failedUploads = results
      .filter(
        (result): result is { error: Error; file: UploadFile } =>
          'error' in result && !!result.error,
      )
      .map((result) => ({
        name: result.file.name,
        message: result.error?.message || 'Upload failed',
      })); // Use optional chaining

    setSuccesses(successfulUploads.map((s) => s.name));
    setErrors(failedUploads);
    setLoading(false);

    if (failedUploads.length > 0 && onError) {
      // Report a general error if any upload fails
      onError(
        new Error(
          `Failed to upload ${failedUploads.length} file(s). See console for details.`,
        ),
      );
    }

    if (successfulUploads.length > 0 && onSuccess) {
      onSuccess(successfulUploads);
    }

    // Don't revoke previews here if files are kept for display
    // Previews are revoked on unmount or when files are replaced/removed
  };

  // Cleanup previews on unmount
  useEffect(() => {
    return () => files.forEach((file) => URL.revokeObjectURL(file.preview));
  }, [files]);

  return {
    ...dropzoneState, // Spread all properties from useDropzone
    files,
    setFiles,
    loading,
    errors, // Upload errors
    successes,
    isSuccess:
      successes.length > 0 &&
      errors.length === 0 &&
      !loading &&
      files.length > 0 &&
      files.every((f) => f.errors.length === 0),
    onUpload,
    inputRef, // Ensure inputRef is returned if needed by Dropzone component
    maxFiles,
    maxFileSize,
  };
};
