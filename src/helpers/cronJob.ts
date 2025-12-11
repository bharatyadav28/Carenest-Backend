import cron from "node-cron";

import { db } from "../db";
import { UserModel } from "../@entities/user/user.model";
import { DocumentModel } from "../@entities/document/document.model";

import { and, eq, or, sql } from "drizzle-orm";
import sendEmail from "./sendEmail";
import { getDocumentUploadReminderHTML } from "./emailText";

export const sendDocumentUploadReminder = async () => {
  const giverType = eq(UserModel.role, "giver");

  const giverDocuments = or(
    eq(DocumentModel.type, "resume"),
    eq(DocumentModel.type, "work_permit")
  );

  const givers = await db
    .select({
      id: UserModel.id,
      email: UserModel.email,
      name: UserModel.name,
      //   documentCount: sql`COUNT(DISTINCT ${DocumentModel.type})`,
    })
    .from(UserModel)
    .leftJoin(DocumentModel, eq(UserModel.id, DocumentModel.userId))
    .where(and(giverType))
    .groupBy(UserModel.id)
    .having(sql`COUNT(DISTINCT ${DocumentModel.type}) < 2`);

  for (const giver of givers) {
    await sendEmail({
      to: giver.email,
      subject: "Document Upload Reminder",
      html: getDocumentUploadReminderHTML(giver.name),
    });
  }
};

cron.schedule("0 0 * * *", async () => {
  try {
    console.log("!!!Cron job running !!!!");
    await sendDocumentUploadReminder();
  } catch (error) {
    console.log(error);
  }
});
