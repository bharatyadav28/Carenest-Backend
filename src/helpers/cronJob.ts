import cron from "node-cron";

import { db } from "../db";
import { UserModel } from "../@entities/user/user.model";
import { DocumentModel } from "../@entities/document/document.model";
import { SubscriptionModel } from "../@entities/subscription/subscription.model";
import { PlanModel } from "../@entities/plan/plan.model";
import { getSubscriptionExpirationReminderHTML } from "./emailText";
import { autoCompleteExpiredBookings } from "../@entities/booking/booking.service";
import { createNotification } from "../@entities/notification/notification.service";

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

cron.schedule("30 6 * * *", async () => {
  try {
    console.log("!!!Cron job running at 12:00 PM IST (06:30 UTC) !!!!");
    await sendDocumentUploadReminder();
    await autoCompleteExpiredBookings();
  } catch (error) {
    console.log("Cron job error:", error);
  }
});

export const sendSubscriptionExpirationReminders = async () => {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Find subscriptions expiring in 3 days that are not auto-renewing
  const expiringSubscriptions = await db
    .select({
      subscription: SubscriptionModel,
      user: UserModel,
      plan: PlanModel,
    })
    .from(SubscriptionModel)
    .innerJoin(UserModel, eq(SubscriptionModel.userId, UserModel.id))
    .innerJoin(PlanModel, eq(SubscriptionModel.planId, PlanModel.id))
    .where(
      and(
        eq(SubscriptionModel.status, "active"),
        eq(SubscriptionModel.cancelAtPeriodEnd, true),
        sql`DATE(${SubscriptionModel.currentPeriodEnd}) = DATE(${threeDaysFromNow})`
      )
    );

  for (const { subscription, user, plan } of expiringSubscriptions) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Your Subscription Expires in 3 Days",
        html: getSubscriptionExpirationReminderHTML(
          user.name || "Customer",
          plan.amount,
          subscription.currentPeriodEnd
        )
      });

      // Create in-app notification
      await createNotification(
        user.id,
        "Subscription Expiring Soon",
        `Your subscription expires in 3 days (${new Date(subscription.currentPeriodEnd).toLocaleDateString()}). Please renew to continue uninterrupted service.`,
        "system"
      );

    } catch (error) {
      console.error(`Failed to send expiration reminder to ${user.id}:`, error);
    }
  }
};

cron.schedule("0 9 * * *", async () => {
  try {
    console.log("Running subscription expiration reminders...");
    await sendSubscriptionExpirationReminders();
  } catch (error) {
    console.error("Error in subscription expiration reminders:", error);
  }
});