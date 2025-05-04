'use client';

import type { Attachment, UIMessage, Message } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { useDropzone, type FileRejection } from 'react-dropzone'; // Import useDropzone

import { ArrowUpIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { generateUUID } from '@/lib/utils'; // Import generateUUID
import { createClient } from '@/lib/supabase/client';
import type { UploadSuccessData } from '@/components/chat'; // Use type import

// Define attachment state type
interface ProcessingAttachment {
  id: string; // Unique ID for tracking
  name: string;
  contentType: string;
  data: ArrayBuffer;
  fileObject: File;
  previewUrl?: string;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  storagePath?: string; // Store path after successful upload
  uploadError?: string;
}

// Define the status type directly
type ChatStatus = 'idle' | 'awaiting_response' | 'in_progress';

// Standalone upload function
const BUCKET_NAME = 'testing';
const UPLOAD_PATH = 'upload/pdf';

async function uploadFileToSupabase(
  file: File,
  onSuccess: (storagePath: string, publicUrl: string) => void,
  onError: (errorMsg: string) => void,
) {
  const supabase = createClient();
  const filePath = `${UPLOAD_PATH}/${Date.now()}_${file.name}`; // Add timestamp for uniqueness

  try {
    console.log(`Uploading ${file.name} to ${filePath}...`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files (though timestamp makes it unlikely)
      });

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('Upload succeeded but no data returned.');
    }

    console.log(`Upload successful for ${file.name}, path: ${data.path}`);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!publicUrlData?.publicUrl) {
      console.warn(
        `Could not get public URL for ${data.path}. Proceeding without it.`,
      );
      // Pass an empty string if URL retrieval fails
      onSuccess(data.path, '');
    } else {
      console.log(`Public URL for ${file.name}: ${publicUrlData.publicUrl}`);
      onSuccess(data.path, publicUrlData.publicUrl); // Pass public URL
    }
  } catch (error: any) {
    console.error(`Supabase upload error for ${file.name}:`, error);
    onError(error.message || 'Unknown upload error');
  }
}

// Helper function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit, // Expect the original handleSubmit from useChat
  onUploadSuccess, // Add the callback prop
  className,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: UseChatHelpers['stop'];
  attachments: Array<ProcessingAttachment>;
  setAttachments: Dispatch<SetStateAction<Array<ProcessingAttachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  onUploadSuccess: (data: UploadSuccessData) => void; // Add type for the callback
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  // Function to update status for a specific attachment
  const updateAttachmentStatus = useCallback(
    (id: string, newStatus: Partial<ProcessingAttachment>) => {
      setAttachments((current) =>
        current.map((att) => (att.id === id ? { ...att, ...newStatus } : att)),
      );
    },
    [setAttachments],
  );

  // Clean up preview URLs
  useEffect(() => {
    const urlsToRevoke = attachments.map((a) => a.previewUrl).filter(Boolean);
    return () => {
      urlsToRevoke.forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, [attachments]); // Rerun when attachments change to handle additions/removals

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        fileRejections.forEach(({ file, errors }) => {
          errors.forEach((err) => {
            toast.error(`Error for ${file.name}: ${err.message}`);
          });
        });
        return;
      }

      // Limit to one file for now based on previous logic
      if (acceptedFiles.length > 1 || attachments.length >= 1) {
        toast.info('Only one PDF can be attached at a time.');
        return;
      }
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const attachmentId = Date.now().toString();

      try {
        const arrayBuffer = await file.arrayBuffer();
        const previewUrl = URL.createObjectURL(file);
        console.log('[MultimodalInput] Created previewUrl:', previewUrl);

        const newAttachment: ProcessingAttachment = {
          id: attachmentId,
          name: file.name,
          contentType: file.type || 'application/pdf',
          data: arrayBuffer,
          fileObject: file,
          previewUrl: previewUrl,
          uploadStatus: 'uploading',
        };

        console.log(
          '[MultimodalInput] Calling setAttachments with:',
          newAttachment,
        );
        setAttachments([newAttachment]);
        toast.info(`Uploading ${file.name}...`);

        // Trigger background upload
        await uploadFileToSupabase(
          file,
          (storagePath, publicUrl) => {
            // onSuccess
            updateAttachmentStatus(attachmentId, {
              uploadStatus: 'success',
              storagePath,
            });
            toast.success(`${file.name} stored successfully!`);
            // Call the passed callback
            onUploadSuccess({ name: file.name, storagePath, publicUrl });
          },
          (errorMsg) => {
            // onError
            updateAttachmentStatus(attachmentId, {
              uploadStatus: 'error',
              uploadError: errorMsg,
            });
            toast.error(`Storage failed for ${file.name}: ${errorMsg}`);
          },
        );
      } catch (error) {
        console.error('Error processing dropped file:', error);
        toast.error(`Failed to process file ${file.name}`);
        // Clean up if processing failed before adding
        setAttachments([]);
      }
    },
    [
      attachments.length,
      setAttachments,
      updateAttachmentStatus,
      onUploadSuccess,
    ], // Update dependencies for onDrop
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: attachments.length > 0, // Disable dropzone if file already attached
  });

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(
        textareaRef.current.scrollHeight + 2,
        window.innerHeight * 0.5,
      );
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      requestAnimationFrame(adjustHeight);
    }
  }, [localStorageInput, setInput]);

  useEffect(() => {
    if (input !== localStorageInput) {
      setLocalStorageInput(input);
    }
  }, [input, localStorageInput, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  // Wrapper function to handle sending the message
  const sendMessage = useCallback(() => {
    const isUploading = attachments.some((a) => a.uploadStatus === 'uploading');
    const hasUploadError = attachments.some((a) => a.uploadStatus === 'error');

    if (isUploading) {
      toast.info('Please wait for file storage upload to complete.');
      return;
    }
    if (hasUploadError) {
      toast.error('Cannot send message: file upload failed.');
      return;
    }

    if (input.trim() === '' && attachments.length === 0) {
      toast.info('Please enter a message or add a file.');
      return;
    }

    // Define part types explicitly, including our custom base64 field
    type TextPart = { type: 'text'; text: string };
    // Modify FilePart to expect data_base64
    type CustomFilePart = {
      type: 'file';
      data_base64: string;
      mimeType: string;
      name?: string;
    };
    type MessagePart = TextPart | CustomFilePart;

    const messageContent: MessagePart[] = [];

    if (input.trim() !== '') {
      messageContent.push({ type: 'text', text: input }); // No cast needed
    }

    attachments.forEach((att) => {
      const base64Data = arrayBufferToBase64(att.data);
      // Create object matching CustomFilePart
      messageContent.push({
        type: 'file',
        data_base64: base64Data,
        mimeType: att.contentType,
        name: att.name,
      }); // No cast needed
    });

    const newMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      parts: messageContent as any, // Keep cast here for UIMessage parts
      content: '',
    };

    append(newMessage);

    // Clear local state after sending
    setAttachments([]);
    setInput('');
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    append,
    setAttachments,
    setInput,
    setLocalStorageInput,
    width,
    input,
  ]);

  // Use the new sendMessage function for form submission and button click
  const handleFormSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault(); // Prevent default form submission if event exists
      sendMessage();
    },
    [sendMessage],
  );

  // Cast status prop to the explicitly defined type for comparison
  const currentStatus = status as ChatStatus;
  const isUploadingAnyFile = attachments.some(
    (a) => a.uploadStatus === 'uploading',
  );

  return (
    <div className="relative w-full flex flex-col gap-2">
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={cx(
          'relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-600',
          {
            'border-blue-500 dark:border-blue-400': isDragActive,
            'min-h-[80px]': attachments.length === 0, // Remove padding/border when showing preview/iframe
            'border-none p-0 min-h-0': attachments.length > 0, // Remove padding/border when showing preview/iframe
          },
        )}
      >
        <input {...getInputProps()} />

        {/* Show Dropzone Prompt / Drag state */}
        {attachments.length === 0 && !isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUploadingAnyFile
                ? 'Uploading...'
                : 'Drop PDF here or click to select'}
            </p>
          </div>
        )}
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Drop the PDF here ...
            </p>
          </div>
        )}

        {/* Show iFrame Preview if attachment exists */}
        {(() => {
          if (attachments.length > 0 && attachments[0].previewUrl) {
            console.log(
              '[MultimodalInput] Rendering iframe with URL:',
              attachments[0].previewUrl,
            );
            return (
              <div className="mt-2 border rounded-md overflow-hidden">
                <iframe
                  src={attachments[0].previewUrl}
                  width="100%"
                  height="400px"
                  title={attachments[0].name}
                  className="block"
                />
                {/* Optional: Overlay upload status on iframe? Could be complex */}
              </div>
            );
          } else {
            console.log(
              '[MultimodalInput] Not rendering iframe. Attachments:',
              attachments,
            );
            return null;
          }
        })()}
      </div>

      {/* Input Textarea (appears below dropzone/iframe) */}
      <div className="relative flex items-end w-full mt-2">
        {' '}
        {/* Add margin top */}
        <Textarea
          data-testid="multimodal-input"
          ref={textareaRef}
          placeholder={
            attachments.length > 0
              ? 'Add a message to send with the PDF...'
              : 'Send a message or drop a PDF...'
          }
          value={input}
          onChange={handleInput}
          className={cx(
            'min-h-[24px] max-h-[calc(50dvh)] overflow-y-auto resize-none rounded-2xl !text-base bg-muted pr-20 pl-4 py-3 dark:border-zinc-700 w-full',
            className,
          )}
          rows={1}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (currentStatus !== 'idle') {
                toast.error('Please wait for the current response to finish!');
              } else {
                // Use the new send function
                sendMessage();
              }
            }
          }}
        />
        <div className="absolute bottom-0 right-0 p-2 flex flex-row items-end justify-end gap-2">
          {currentStatus === 'in_progress' ? (
            <StopButton stop={stop} setMessages={setMessages} />
          ) : (
            <SendButton
              // Use the new send function
              submitForm={sendMessage}
              input={input}
              disabled={
                attachments.some((a) => a.uploadStatus === 'uploading') || // Disable while uploading
                (input.trim() === '' && attachments.length === 0)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Update parent component (<Chat>) to pass the correct props
// and manage the ProcessingAttachment[] state
export const MultimodalInput = memo(PureMultimodalInput, equal);

// StopButton and SendButton remain the same

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: UseChatHelpers['stop'];
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      variant="secondary"
      size="icon"
      className="rounded-xl size-10 dark:bg-zinc-700"
      onClick={() => {
        stop();
        setMessages((msgs: Message[]) =>
          msgs.filter((msg) => msg.role !== 'assistant'),
        );
      }}
      data-testid="stop-button"
    >
      <StopIcon />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm, // Receives sendMessage now
  input,
  disabled,
}: {
  submitForm: () => void;
  input: string;
  disabled: boolean;
}) {
  return (
    <Button
      data-testid="send-button"
      variant="secondary"
      size="icon"
      className="rounded-xl size-10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      onClick={submitForm}
      disabled={disabled}
    >
      <ArrowUpIcon />
    </Button>
  );
}

const SendButton = memo(PureSendButton);
