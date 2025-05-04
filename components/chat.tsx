'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { Button } from './ui/button';

// Define attachment state type (copied from multimodal-input for now)
// Consider moving this to a shared types file (e.g., types/index.ts)
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

// Define type for upload success callback data
export interface UploadSuccessData {
  name: string;
  storagePath: string;
  publicUrl: string;
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarPdf, setSidebarPdf] = useState<UploadSuccessData | null>(null);

  // State to temporarily hold upload result
  const [latestUploadResult, setLatestUploadResult] =
    useState<UploadSuccessData | null>(null);

  // Callback for MultimodalInput to report success
  const handleUploadSuccess = useCallback(
    (data: UploadSuccessData) => {
      console.log('Upload success reported to Chat component:', data);
      setLatestUploadResult(data);
      if (!sidebarPdf) {
        setSidebarPdf(data);
        setIsSidebarOpen(true);
      }
    },
    [sidebarPdf],
  );

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: async (/* message: Message */) => {
      // Default mutate logic
      mutate(unstable_serialize(getChatHistoryPaginationKey));

      // --- Logic to update DB with storage path ---
      if (latestUploadResult) {
        const lastUserMessage = [...messages]
          .reverse()
          .find((m) => m.role === 'user');

        if (lastUserMessage?.id) {
          console.log(
            `Attempting to update message ${lastUserMessage.id} with path ${latestUploadResult.storagePath}`,
          );
          try {
            const apiResponse = await fetch('/api/message/update-attachment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatId: id,
                messageId: lastUserMessage.id,
                attachmentName: latestUploadResult.name,
                storagePath: latestUploadResult.storagePath,
              }),
            });
            const result = await apiResponse.json();
            if (!apiResponse.ok) {
              throw new Error(
                result.error || 'Failed to update attachment path',
              );
            }
            console.log(
              'Successfully updated message attachment path:',
              result,
            );
          } catch (error) {
            console.error('Error calling update-attachment API:', error);
            toast.error('Failed to link stored file to message.');
          }
        } else {
          console.warn(
            'Could not find last user message ID in onFinish to update attachment.',
          );
        }
        setLatestUploadResult(null);
      }
      // --- End DB update logic ---
    },
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<ProcessingAttachment>>(
    [],
  );
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex h-dvh bg-background">
        <div className="flex flex-col flex-grow min-w-0">
          <ChatHeader
            chatId={id}
            selectedModelId={selectedChatModel}
            selectedVisibilityType={selectedVisibilityType}
            isReadonly={isReadonly}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="ml-auto"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
              <span className="sr-only">
                {isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
              </span>
            </Button>
          </ChatHeader>

          <Messages
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
          />

          <form
            onSubmit={handleSubmit}
            className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl"
          >
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                onUploadSuccess={handleUploadSuccess}
              />
            )}
          </form>
        </div>

        {isSidebarOpen && (
          <div className="w-64 flex-shrink-0 border-l border-border p-4 bg-muted/40 flex flex-col">
            <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
              Attached PDF
            </h3>
            {sidebarPdf?.publicUrl ? (
              (() => {
                console.log(
                  'Sidebar rendering iframe with URL:',
                  sidebarPdf.publicUrl,
                );
                return (
                  <div className="flex-grow min-h-0">
                    <iframe
                      src={sidebarPdf.publicUrl}
                      title={sidebarPdf.name}
                      className="w-full h-full border-0"
                    />
                  </div>
                );
              })()
            ) : sidebarPdf ? (
              <div>
                <p className="text-sm font-medium break-words">
                  {sidebarPdf.name}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  Preview unavailable (URL missing).
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No PDF attached yet.
              </p>
            )}
          </div>
        )}
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={[]}
        setAttachments={() => {}}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
