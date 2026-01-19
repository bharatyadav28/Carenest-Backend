import { eq, and, inArray,sql } from "drizzle-orm";
import { db } from "../../db";
import { UserModel } from "./user.model";
import sendEmail from "../../helpers/sendEmail";

interface EmailResult {
  total: number;
  sent: number;
  failed: number;
  failedEmails: Array<{ email: string; error: string }>;
}

export class BulkEmailService {
  /**
   * Send emails to selected users with parallel processing
   */
  static async sendToSelectedUsers(
    userIds: string[],
    subject: string,
    message: string
  ): Promise<EmailResult> {
    const result: EmailResult = {
      total: 0,
      sent: 0,
      failed: 0,
      failedEmails: [],
    };

    try {
      // Get users by their IDs
      const users = await db
        .select({
          id: UserModel.id,
          email: UserModel.email,
          name: UserModel.name,
        })
        .from(UserModel)
        .where(
          and(
            inArray(UserModel.id, userIds),
            eq(UserModel.isDeleted, false),
            eq(UserModel.isEmailVerified, true)
          )
        );

      result.total = users.length;

      if (result.total === 0) {
        throw new Error("No valid users found with the selected IDs");
      }

      // Process emails in batches for better performance
      const batchSize = 5; // Process 5 emails at a time
      const batches = this.chunkArray(users, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchResults = await this.processEmailBatch(batch, subject, message);
        
        result.sent += batchResults.sent;
        result.failed += batchResults.failed;
        result.failedEmails.push(...batchResults.failedEmails);

        // Small delay between batches to avoid overwhelming the email service
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return result;

    } catch (error: any) {
      console.error("Bulk email error:", error);
      throw new Error(`Failed to send bulk emails: ${error.message}`);
    }
  }

  /**
   * Process a batch of emails in parallel
   */
  private static async processEmailBatch(
    users: Array<{ id: string; email: string; name: string | null }>,
    subject: string,
    message: string
  ): Promise<Pick<EmailResult, 'sent' | 'failed' | 'failedEmails'>> {
    const batchResult = {
      sent: 0,
      failed: 0,
      failedEmails: [] as Array<{ email: string; error: string }>,
    };

    // Create email promises for all users in the batch
    const emailPromises = users.map(async (user) => {
      try {
        await this.sendEmailToUser(user.email, user.name, subject, message);
        return { success: true, email: user.email };
      } catch (error: any) {
        return { 
          success: false, 
          email: user.email, 
          error: error.message 
        };
      }
    });

    // Wait for all emails in this batch to complete
    const results = await Promise.allSettled(emailPromises);

    // Process results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (value.success) {
          batchResult.sent++;
        } else {
          batchResult.failed++;
          batchResult.failedEmails.push({
            email: value.email,
            error: value.error || 'Unknown error'
          });
        }
      } else {
        batchResult.failed++;
        batchResult.failedEmails.push({
          email: 'unknown',
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });

    return batchResult;
  }

  /**
   * Split array into chunks
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Send email to a single user with retry logic
   */
  private static async sendEmailToUser(
    email: string,
    name: string | null,
    subject: string,
    message: string,
    retries = 2
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const emailHTML = this.createEmailHTML(name, subject, message);
        
        await sendEmail({
          to: email,
          subject: subject,
          html: emailHTML,
        });

        console.log(`✅ Email sent to: ${email}`);
        return; // Success, exit the function

      } catch (error: any) {
        lastError = error;
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(`Retry ${attempt + 1}/${retries} for ${email} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to send email to ${email} after ${retries} retries: ${lastError?.message}`);
  }

  /**
   * Create email HTML template
   */
  private static createEmailHTML(
    name: string | null,
    subject: string,
    message: string
  ): string {
    const userName = name || "User";
    const formattedMessage = message.replace(/\n/g, '<br>');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header { 
            background: #233D4D; 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
          }
          .content { 
            padding: 40px; 
            background: #f9f9f9; 
            min-height: 200px;
          }
          .greeting { 
            font-size: 18px; 
            margin-bottom: 20px; 
            color: #233D4D; 
            font-weight: 600;
          }
          .message { 
            font-size: 16px; 
            line-height: 1.8; 
            color: #555;
          }
          .signature { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            font-size: 14px; 
            color: #777;
          }
          .footer { 
            text-align: center; 
            padding: 20px; 
            background: #f1f1f1; 
            color: #666; 
            font-size: 12px; 
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${userName},</div>
            <div class="message">
              ${formattedMessage}
            </div>
            <div class="signature">
              Best regards,<br>
              <strong>The CareWorks Team</strong>
            </div>
          </div>
          
          <div class="footer">
            <p>This email was sent by CareWorks Admin Panel</p>
            <p>© ${new Date().getFullYear()} CareWorks. All rights reserved.</p>
            <p style="font-size: 10px; color: #999; margin-top: 10px;">
              You are receiving this email because you are a registered user of CareWorks.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Quick check if users exist
   */
  static async validateUsers(userIds: string[]): Promise<{ valid: string[], invalid: string[] }> {
    const users = await db
      .select({
        id: UserModel.id,
      })
      .from(UserModel)
      .where(
        and(
          inArray(UserModel.id, userIds),
          eq(UserModel.isDeleted, false),
          eq(UserModel.isEmailVerified, true)
        )
      );

    const validIds = users.map(u => u.id);
    const invalidIds = userIds.filter(id => !validIds.includes(id));

    return {
      valid: validIds,
      invalid: invalidIds
    };
  }

  /**
   * Get users for selection with pagination
   */
  static async getUsersForSelection(page = 1, limit = 50, search = '') {
    const offset = (page - 1) * limit;
    
    let query = db
      .select({
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        role: UserModel.role,
        isEmailVerified: UserModel.isEmailVerified,
      })
      .from(UserModel)
      .where(
        and(
          eq(UserModel.isDeleted, false),
          eq(UserModel.isEmailVerified, true)
        )
      );

  

    const users = await query
      .orderBy(UserModel.name)
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(UserModel)
      .where(
        and(
          eq(UserModel.isDeleted, false),
          eq(UserModel.isEmailVerified, true)
        )
      );

    return {
      users,
      pagination: {
        page,
        limit,
        total: Number(total[0]?.count || 0),
        pages: Math.ceil(Number(total[0]?.count || 0) / limit),
      },
    };
  }
}