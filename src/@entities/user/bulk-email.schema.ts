import { z } from "zod";

export const sendBulkEmailSchema = z.object({
  userIds: z.array(z.string()).min(1, "Select at least one user"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export type SendBulkEmailDto = z.infer<typeof sendBulkEmailSchema>;