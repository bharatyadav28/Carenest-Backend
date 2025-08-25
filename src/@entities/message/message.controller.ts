import { Request, Response } from "express";

import { db } from "../../db";
import { MessageModel, Conversation } from "./message.model";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { UserModel } from "../user";
import { BadRequestError, NotFoundError } from "../../errors";

export const getUserAllChats = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    // Get all conversations for the user with other user details
    const conversations = await db
      .select({
        conversationId: Conversation.id,
        lastMessageText: Conversation.lastMessageText,
        lastMessageTime: Conversation.lastMessageTime,
        lastMessageSenderId: Conversation.lastMessageSenderId,
        otherUser: {
          id: sql<string>`
            CASE 
              WHEN ${Conversation.participant1Id} = ${userId} 
              THEN p2.id
              ELSE p1.id
            END
          `,
          name: sql<string>`
            CASE 
              WHEN ${Conversation.participant1Id} = ${userId} 
              THEN p2.name
              ELSE p1.name
            END
          `,
          avatar: sql<string>`
            CASE 
              WHEN ${Conversation.participant1Id} = ${userId} 
              THEN p2.avatar
              ELSE p1.avatar
            END
          `,
        },
        unreadCount: sql<number>`
          (SELECT COUNT(*) 
           FROM ${MessageModel} 
           WHERE ${MessageModel.conversationId} = ${Conversation.id} 
           AND ${MessageModel.toUserId} = ${userId} 
           AND ${MessageModel.isRead} = false)
        `,
      })
      .from(Conversation)
      .leftJoin(
        sql`${UserModel} as p1`,
        eq(Conversation.participant1Id, sql`p1.id`)
      )
      .leftJoin(
        sql`${UserModel} as p2`,
        eq(Conversation.participant2Id, sql`p2.id`)
      )
      .where(
        or(
          eq(Conversation.participant1Id, userId),
          eq(Conversation.participant2Id, userId)
        )
      )
      .orderBy(desc(Conversation.lastMessageTime));

    // Format the response for frontend
    const chats = conversations.map((conv) => ({
      conversationId: conv.conversationId,
      otherUser: conv.otherUser,
      lastMessage: {
        text: conv.lastMessageText || "No messages yet",
        time: conv.lastMessageTime,
        fromMe: conv.lastMessageSenderId === userId,
      },
      unreadCount: conv.unreadCount,
    }));

    res.json({
      success: true,
      message: "User chats retrieved successfully",
      data: { chats },
    });
  } catch (error) {
    console.error("Error getting user chats:", error);
    throw new BadRequestError("Failed to retrieve chats");
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  const { otherUserId } = req.params;
  const currentUserId = req.user.id;

  try {
    // First, find the conversation
    const conversation = await db.query.Conversation.findFirst({
      where: or(
        and(
          eq(Conversation.participant1Id, currentUserId),
          eq(Conversation.participant2Id, otherUserId)
        ),
        and(
          eq(Conversation.participant1Id, otherUserId),
          eq(Conversation.participant2Id, currentUserId)
        )
      ),
    });

    if (!conversation) {
      return res.json({
        success: true,
        message: "No conversation found",
        data: {
          conversationId: null,
          messages: [],
        },
      });
    }

    // Get messages for this conversation with sender details
    const messages = await db
      .select({
        id: MessageModel.id,
        message: MessageModel.message,
        fromUserId: MessageModel.fromUserId,
        toUserId: MessageModel.toUserId,
        isRead: MessageModel.isRead,
        createdAt: MessageModel.createdAt,
        sender: {
          id: UserModel.id,
          name: UserModel.name,
          avatar: UserModel.avatar,
        },
      })
      .from(MessageModel)
      .innerJoin(UserModel as any, eq(MessageModel.fromUserId, UserModel.id))
      .where(eq(MessageModel.conversationId, conversation.id))
      .orderBy(desc(MessageModel.createdAt))
      .limit(50);

    res.json({
      success: true,
      message: "Chat history retrieved successfully",
      data: {
        conversationId: conversation.id,
        messages: messages.reverse(),
      },
    });
  } catch (error) {
    console.error("Error getting chat history:", error);
    throw new Error("Failed to retrieve chat history");
  }
};

// Mark messages as read
export const markAsRead = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.id;

  if (!conversationId) {
    throw new BadRequestError("Conversation ID is required");
  }

  try {
    // Verify the conversation exists and user is a participant
    const conversation = await db.query.Conversation.findFirst({
      where: and(
        eq(Conversation.id, conversationId),
        or(
          eq(Conversation.participant1Id, currentUserId),
          eq(Conversation.participant2Id, currentUserId)
        )
      ),
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found or access denied");
    }

    // Mark all unread messages in this conversation as read
    await db
      .update(MessageModel)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(MessageModel.conversationId, conversationId),
          eq(MessageModel.toUserId, currentUserId),
          eq(MessageModel.isRead, false)
        )
      );

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new BadRequestError("Failed to mark messages as read");
  }
};
