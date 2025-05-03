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

import { ArrowUpIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { createClient } from '@/lib/supabase/client';

// Define the status type directly
type ChatStatus = 'idle' | 'awaiting_response' | 'in_progress';

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
  handleSubmit,
  className,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: UseChatHelpers['stop'];
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const supabase = createClient();

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

  const BUCKET_NAME = 'testing';
  const UPLOAD_PATH = 'upload/pdf';
  const dropzoneProps = useSupabaseUpload({
    bucketName: BUCKET_NAME,
    path: UPLOAD_PATH,
    allowedMimeTypes: ['application/pdf'],
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024,
    onSuccess: async (results) => {
      const newAttachments: Attachment[] = [];
      for (const result of results) {
        try {
          const fullPath = result.path;
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(fullPath, 3600);

          if (signedUrlError) throw signedUrlError;

          if (signedUrlData?.signedUrl) {
            newAttachments.push({
              name: result.name,
              url: signedUrlData.signedUrl,
              contentType: 'application/pdf',
            });
          } else {
            throw new Error('Failed to get signed URL');
          }
        } catch (error) {
          console.error('Error getting signed URL:', error);
          toast.error(`Failed to get URL for ${result.name}`);
        }
      }
      if (newAttachments.length > 0) {
        setAttachments((current) => [...current, ...newAttachments]);
        toast.success(
          `Attached ${newAttachments.length} file(s) successfully!`,
        );
      }
      if (dropzoneProps.setFiles) {
        dropzoneProps.setFiles([]);
      }
    },
    onError: (error) => {
      console.error('Dropzone Upload Error:', error);
      toast.error(error.message || 'File upload failed.');
      if (dropzoneProps.setFiles) {
        dropzoneProps.setFiles([]);
      }
    },
  });

  const submitForm = useCallback(() => {
    if (dropzoneProps.loading) {
      toast.info('Please wait for the file upload to complete.');
      return;
    }

    window.history.replaceState({}, '', `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setInput('');
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setInput,
    setLocalStorageInput,
    width,
    chatId,
    dropzoneProps.loading,
  ]);

  // Cast status prop to the explicitly defined type for comparison
  const currentStatus = status as ChatStatus;

  return (
    <div className="relative w-full flex flex-col gap-2">
      <Dropzone {...dropzoneProps} className="border-none p-0">
        {(dropzoneProps.files.length > 0 || dropzoneProps.loading) && (
          <div className="px-4 pt-2">
            <DropzoneContent />
          </div>
        )}

        {dropzoneProps.files.length === 0 &&
          attachments.length === 0 &&
          !dropzoneProps.loading && (
            <div className="absolute inset-x-0 top-0 mt-2 pointer-events-none z-10 flex justify-center">
              <DropzoneEmptyState className="text-xs p-2 bg-background/80 rounded-md" />
            </div>
          )}

        {attachments.length > 0 && (
          <div
            data-testid="attachments-preview"
            className="flex flex-row gap-2 overflow-x-scroll items-end px-4 pt-2"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}

        <div className="relative flex items-end w-full">
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            placeholder={
              attachments.length > 0 || dropzoneProps.files.length > 0
                ? 'Add a message...'
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
                  toast.error(
                    'Please wait for the current response to finish!',
                  );
                } else {
                  submitForm();
                }
              }
            }}
          />

          <div className="absolute bottom-0 right-0 p-2 flex flex-row items-end justify-end gap-2">
            {currentStatus === 'in_progress' ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <SendButton
                submitForm={submitForm}
                input={input}
                disabled={
                  dropzoneProps.loading ||
                  (input.trim() === '' && attachments.length === 0)
                }
              />
            )}
          </div>
        </div>
      </Dropzone>
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput, equal);

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
  submitForm,
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
