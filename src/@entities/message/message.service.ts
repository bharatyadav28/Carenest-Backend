import { db } from "../../db";
import { MessageModel, Conversation } from "./message.model";
import { eq, and, or } from "drizzle-orm";

interface messageProps {
  fromUserId: string;
  toUserId: string;
  message: string;
}

// Helper function to get or create conversation
const getOrCreateConversation = async (
  participant1Id: string,
  participant2Id: string
) => {
  // Check if conversation exists (check both orders)
  let conversation = await db.query.Conversation.findFirst({
    where: or(
      and(
        eq(Conversation.participant1Id, participant1Id),
        eq(Conversation.participant2Id, participant2Id)
      ),
      and(
        eq(Conversation.participant1Id, participant2Id),
        eq(Conversation.participant2Id, participant1Id)
      )
    ),
  });

  // Create new conversation if it doesn't exist
  if (!conversation) {
    const [newConversation] = await db
      .insert(Conversation)
      .values({
        participant1Id,
        participant2Id,
        lastMessageText: "",
        lastMessageTime: new Date(),
        lastMessageSenderId: participant1Id,
      })
      .returning();

    conversation = newConversation;
  }

  return conversation;
};
export const saveMessage = async ({
  fromUserId,
  toUserId,
  message,
}: messageProps) => {
  const conversation = await getOrCreateConversation(fromUserId, toUserId);

  const savedMessage = await db
    .insert(MessageModel)
    .values({
      conversationId: conversation.id,
      fromUserId,
      toUserId,
      message,
    })
    .returning();

  if (!savedMessage || savedMessage.length === 0) {
    throw new Error("Failed to save message");
  }

  // Update conversation with latest message info
  await db
    .update(Conversation)
    .set({
      lastMessageId: savedMessage[0].id,
      lastMessageText: message.substring(0, 500), // Truncate if too long
      lastMessageTime: new Date(),
      lastMessageSenderId: fromUserId,
      updatedAt: new Date(),
    })
    .where(eq(Conversation.id, conversation.id));

  return savedMessage?.[0];
};
