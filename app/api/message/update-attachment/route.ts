import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getMessageById, updateMessageAttachments } from '@/lib/db/queries';
import { z } from 'zod';

// Define the expected request body schema
const updateSchema = z.object({
  chatId: z.string(), // Included for ownership check
  messageId: z.string(),
  attachmentName: z.string(), // Identify which attachment to update
  storagePath: z.string(), // The path from Supabase storage
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parseResult = updateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { chatId, messageId, attachmentName, storagePath } = parseResult.data;

    // --- Authorization Check (Crucial!) ---
    // Verify the user owns the message they are trying to update
    const messagesResult = await getMessageById({ id: messageId });

    if (!messagesResult || messagesResult.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    const existingMessage = messagesResult[0]; // Get the first message

    // We need the chat details to verify ownership
    // Assuming getMessageById doesn't return chat info, we might need getChatById or modify getMessageById
    // For now, let's assume we have a way to check ownership based on messageId or chatId
    // THIS IS A PLACEHOLDER - IMPLEMENT PROPER OWNERSHIP CHECK
    if (existingMessage.chatId !== chatId) {
      // Basic check, might need more robust logic
      return NextResponse.json({ error: 'Mismatch chat ID' }, { status: 400 });
    }
    // TODO: Add a query to verify userId owns the chat associated with existingMessage.chatId
    // const chat = await getChatById({ id: existingMessage.chatId });
    // if (!chat || chat.userId !== userId) {
    //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }
    console.warn('Ownership check in update-attachment is incomplete.'); // Reminder

    // --- Prepare Updated Attachments ---
    // Fetch existing attachments and update the specific one
    let currentAttachments = (existingMessage.attachments as any[]) || [];
    let updated = false;

    currentAttachments = currentAttachments.map((att) => {
      if (att.name === attachmentName) {
        updated = true;
        return { ...att, storagePath: storagePath }; // Add storagePath
      }
      return att;
    });

    // Optional: If no attachment matched by name, maybe add it?
    // Depends on whether initial save includes placeholders.
    if (!updated) {
      console.warn(
        `Attachment named "${attachmentName}" not found in message ${messageId}. Appending instead.`,
      );
      currentAttachments.push({
        name: attachmentName,
        storagePath: storagePath,
        contentType: 'application/pdf' /* Assuming PDF */,
      });
    }

    // --- Update Database ---
    await updateMessageAttachments({
      messageId: messageId,
      attachments: currentAttachments,
    });

    return NextResponse.json({ success: true, messageId: messageId });
  } catch (error: any) {
    console.error('[API] Error updating message attachment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 },
    );
  }
}
