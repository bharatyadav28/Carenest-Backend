import { Request, Response } from "express";
import { ConversationModel, MessageModel } from "./message.model";
import { db } from "../../db";
import { and, or, eq, asc, max, sql, ne } from "drizzle-orm";
import { BadRequestError } from "../../errors";
import { UserModel } from "../user/user.model";

export const getChatHistory = async (req: Request, res: Response) => {
  const currentUserId = req.user.id;
  const otherParticipantId = req.params.id;

  const existingConversation = await db
    .select({ id: ConversationModel.id })
    .from(ConversationModel)
    .where(
      or(
        and(
          eq(ConversationModel.participant1Id, currentUserId),
          eq(ConversationModel.participant2Id, otherParticipantId)
        ),
        and(
          eq(ConversationModel.participant1Id, otherParticipantId),
          eq(ConversationModel.participant2Id, currentUserId)
        )
      )
    );

  if (!existingConversation || existingConversation.length === 0) {
    throw new BadRequestError("No existing conversation found");
  }

  //   Mark messages read
  await db
    .update(MessageModel)
    .set({
      hasRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(MessageModel.conversationId, existingConversation[0].id),
        ne(MessageModel.fromUserId, currentUserId),
        eq(MessageModel.hasRead, false)
      )
    );

  const messagesPromise = db
    .select({
      id: MessageModel.id,
      conversationId: MessageModel.conversationId,
      isOtherUserMessage: sql<boolean>`${MessageModel.fromUserId} != ${currentUserId}`,
      message: MessageModel.message,
      createdAt: MessageModel.createdAt,
      hasRead: MessageModel.hasRead,
    })
    .from(MessageModel)

    .where(eq(MessageModel.conversationId, existingConversation[0].id))

    .orderBy(asc(MessageModel.createdAt));

  const otherUserDetailsPromise = db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      avatar: UserModel.avatar,
    })
    .from(UserModel)
    .where(eq(UserModel.id, otherParticipantId))
    .limit(1);

  const [messages, otherUserDetails] = await Promise.all([
    messagesPromise,
    otherUserDetailsPromise,
  ]);

  return res.status(200).json({
    success: true,
    message: "Chat history retrieved successfully",
    data: { messages, otherUserDetails: otherUserDetails?.[0] },
  });
};

export const getAllChats = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const conversations = await db
    .select({
      id: ConversationModel.id,
      toUser: {
        id: UserModel.id,
        name: UserModel.name,
        avatar: UserModel.avatar,
        role: UserModel.role,
      },
      lastMessage: {
        message: MessageModel.message,
        createdAt: MessageModel.createdAt,
      },
      unReadCount: sql`(
        SELECT COUNT(*)
        FROM messages
        WHERE conversation_id = ${ConversationModel.id}
        AND has_read = false
        )`,
    })
    .from(ConversationModel)
    .where(
      or(
        eq(ConversationModel.participant1Id, userId),
        eq(ConversationModel.participant2Id, userId)
      )
    )
    .innerJoin(
      UserModel,
      sql`
        ${UserModel.id} = 
        CASE
            WHEN ${ConversationModel.participant1Id} = ${userId} THEN ${ConversationModel.participant2Id}
            ELSE ${ConversationModel.participant1Id}
        END
    `
    )
    .innerJoin(
      MessageModel,
      and(
        eq(ConversationModel.id, MessageModel.conversationId),
        sql`${MessageModel.createdAt} = 
            (SELECT MAX(created_at)
            FROM messages
            WHERE conversation_id = ${ConversationModel.id}
        )`
      )
    )
    .orderBy(asc(MessageModel.createdAt));

  return res.status(200).json({
    success: true,
    message: "Chats fetched successfully",
    data: {
      conversations,
    },
  });
};
