import cron from "node-cron";
import { db } from "../db";
import { UserModel } from "../@entities/user/user.model";
import { DocumentModel } from "../@entities/document/document.model";
import { OrderModel } from "../@entities/order/order.model";
import { and, eq, or, sql, lt, gte } from "drizzle-orm";
import sendEmail from "./sendEmail";
import { getDocumentUploadReminderHTML} from "./emailText";

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

export const checkExpiredSubscriptions = async () => {
  const now = new Date();
  
  // Find users with expired subscriptions
  const expiredUsers = await db
    .select({
      id: UserModel.id,
      email: UserModel.email,
      name: UserModel.name,
      subscriptionEndDate: UserModel.subscriptionEndDate,
    })
    .from(UserModel)
    .where(
      and(
        eq(UserModel.hasSubscription, true),
        lt(UserModel.subscriptionEndDate, now)
      )
    );

  // Update expired subscriptions
  if (expiredUsers.length > 0) {
    const userIds = expiredUsers.map(user => user.id);
    
    await db
      .update(UserModel)
      .set({
        hasSubscription: false,
        subscriptionPlanId: null,
      })
      .where(sql`${UserModel.id} IN (${userIds.join(',')})`);

    // Send expiry notification
    // for (const user of expiredUsers) {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Your Subscription Has Expired",
    //     html: getSubscriptionExpiryHTML(user.name),
    //   });
    // }

    console.log(`Updated ${expiredUsers.length} expired subscriptions`);
  }

  // Send renewal reminders (7 days before expiry)
  const renewalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const expiringSoonUsers = await db
    .select({
      id: UserModel.id,
      email: UserModel.email,
      name: UserModel.name,
      subscriptionEndDate: UserModel.subscriptionEndDate,
    })
    .from(UserModel)
    .where(
      and(
        eq(UserModel.hasSubscription, true),
        gte(UserModel.subscriptionEndDate, now),
        lt(UserModel.subscriptionEndDate, renewalDate)
      )
    );

  for (const user of expiringSoonUsers) {
    const daysRemaining = Math.ceil(
      (new Date(user.subscriptionEndDate!).getTime() - now.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    // await sendEmail({
    //   to: user.email,
    //   subject: `Your Subscription Expires in ${daysRemaining} days`,
    //   html: getSubscriptionExpiryHTML(user.name, daysRemaining),
    // });
  }
};

// Schedule cron jobs
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("!!! Cron job running - Document reminders !!!");
    await sendDocumentUploadReminder();
  } catch (error) {
    console.log("Document reminder error:", error);
  }
});

cron.schedule("0 1 * * *", async () => { // Run at 1 AM daily
  try {
    console.log("!!! Cron job running - Subscription checks !!!");
    await checkExpiredSubscriptions();
  } catch (error) {
    console.log("Subscription check error:", error);
  }
});