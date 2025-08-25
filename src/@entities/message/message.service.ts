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
  // const existingConversation = await db.select().from(Conversation).
};

export const saveMessage = () => {};
