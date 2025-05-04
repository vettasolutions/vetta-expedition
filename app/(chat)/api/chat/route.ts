import {
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
  CoreMessage,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';

import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import {
  searchProduct,
  searchAntibody,
  searchProductsByDescription,
} from '@/lib/ai/tools/supabase-tools';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: {
          ...userMessage,
          content: userMessage.content ?? '',
        },
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const coreMessages: CoreMessage[] = messages.map((message) => {
      const userParts =
        message.role === 'user' && Array.isArray(message.parts)
          ? message.parts
          : [];
      const fileParts = userParts.filter(
        (part: any) => part.type === 'file' && part.data_base64,
      );
      const textPart = userParts.find((part: any) => part.type === 'text');
      const textContent =
        textPart?.value ||
        (typeof message.content === 'string' ? message.content : '') ||
        '';

      if (message.id === userMessage.id && fileParts.length > 0) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: textContent },
            ...fileParts.map((part: any) => ({
              type: 'file' as const,
              data: Buffer.from(part.data_base64, 'base64'),
              mimeType: part.mimeType,
              name: part.name,
            })),
          ],
        };
      }

      return {
        role: message.role,
        content: textContent || (message.content ?? ''),
      } as CoreMessage;
    });

    const dbAttachments = (userMessage.parts ?? [])
      .filter((part: any) => part.type === 'file')
      .map((part: any) => ({
        name: part.name,
        contentType: part.mimeType,
      }));

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: (userMessage.parts ?? []).filter(
            (part: any) => part.type === 'text',
          ),
          attachments: dbAttachments,
          createdAt: new Date(),
        },
      ],
    });

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt,
          messages: coreMessages,
          maxSteps: 5,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
            searchProduct,
            searchAntibody,
            searchProductsByDescription,
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: coreMessages,
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: Array.isArray(assistantMessage.content)
                        ? assistantMessage.content.map((part) => ({
                            type: part.type,
                            value: (part as any).text || '',
                          }))
                        : [
                            {
                              type: 'text',
                              value: assistantMessage.content ?? '',
                            },
                          ],
                      attachments: [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (error) {
                console.error('Failed to save assistant message:', error);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error('Error in streamText execution:', error);
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
