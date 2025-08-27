import { db } from "../../db";
import { MessageModel, ConversationModel } from "./message.model";
import { eq, and, or } from "drizzle-orm";

interface messageProps {
  fromUserId: string;
  toUserId: string;
  message: string;
}

const getConversation = async (
  participant1Id: string,
  participant2Id: string
) => {
  const existingConversation = await db
    .select()
    .from(ConversationModel)
    .where(
      or(
        and(
          eq(ConversationModel.participant1Id, participant1Id),
          eq(ConversationModel.participant2Id, participant2Id)
        ),
        and(
          eq(ConversationModel.participant1Id, participant2Id),
          eq(ConversationModel.participant2Id, participant1Id)
        )
      )
    );

  if (existingConversation && existingConversation?.length > 0) {
    return existingConversation[0];
  }

  const newConversation = await db
    .insert(ConversationModel)
    .values({
      participant1Id,
      participant2Id,
    })
    .returning();

  return newConversation[0];
};

export const saveMessage = async (
  fromUserId: string,
  toUserId: string,
  message: string
) => {
  const conversation = await getConversation(fromUserId, toUserId);
  if (!conversation?.id || typeof conversation.id !== "string") {
    throw new Error("Conversation not found");
  }

  const savedMessage = await db
    .insert(MessageModel)
    .values({
      conversationId: conversation.id,
      fromUserId,
      message,
    })
    .returning();

  if (!savedMessage || savedMessage.length === 0) {
    throw new Error("Failed to save message");
  }

  return savedMessage[0];
};
