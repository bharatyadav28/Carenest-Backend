import { Queue, Worker } from "bullmq";
import { sendServiceReminderEmail } from "../@entities/booking/booking.service";
import { bulkCreateUsers } from "../@entities/user/user.service";
import { ConnectionOptions } from "bullmq";
import * as fs from "fs";

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASS,
};

console.log("🔗 Redis Connection Config:", {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const myQueue = new Queue("careworks-queue", { connection });

// Listen to queue events
myQueue.on("error", (err) => {
  console.error("❌ Queue Error:", err);
});

myQueue.on("waiting", (job) => {
  console.log(`⏳ Job ${job.id} is waiting in queue`);
});

export async function scheduleStartJob({
  id,
  startDate,
}: {
  id: string;
  startDate: string;
}) {
  const now = new Date();
  const twelveHoursMs = 1000 * 60 * 60 * 12;

  const delay = new Date(startDate).getTime() - twelveHoursMs - now.getTime();

  if (delay > 0) {
    await myQueue.add("SendServiceReminder", { bookingId: id }, { delay });
  }
}

export async function scheduleDocsUploadJob({ id }: { id: string }) {
  await myQueue.add("docsUploadReminder", { bookingId: id });
}

export async function scheduleBulkUserUploadJob({
  filePath,
  fileName,
}: {
  filePath: string;
  fileName: string;
}) {
  console.log("📝 Adding job to queue:", {
    filePath,
    fileName,
    fileExists: fs.existsSync(filePath),
  });

  const job = await myQueue.add("BulkUserUpload", { filePath, fileName });
  console.log("✅ Job added to queue with ID:", job.id);
}

const worker = new Worker(
  "careworks-queue",
  async (job) => {
    console.log("\n🔄 ========== WORKER PROCESSING ==========");
    console.log("📋 Job Name:", job.name);
    console.log("📋 Job ID:", job.id);
    console.log("📋 Job Data:", job.data);

    try {
      switch (job.name) {
        case "SendServiceReminder":
          console.log("📧 Processing SendServiceReminder...");
          await sendServiceReminderEmail({ bookingId: job.data.bookingId });
          console.log("✅ SendServiceReminder completed");
          break;
        case "docsUploadReminder":
          console.log("📄 Processing docsUploadReminder...");
          // Handle document upload reminder
          console.log("✅ docsUploadReminder completed");
          break;
        case "BulkUserUpload":
          console.log("👥 Processing BulkUserUpload...");
          console.log("📂 File path:", job.data.filePath);
          console.log("📂 File exists:", fs.existsSync(job.data.filePath));

          const result = await bulkCreateUsers({
            filePath: job.data.filePath,
            fileName: job.data.fileName,
          });

          console.log(`✅ Bulk user upload completed for file: ${job.data.fileName}`);
          console.log("📊 Results:", result);
          return result;
        default:
          console.warn("⚠️ Unknown job type:", job.name);
      }
    } catch (error) {
      console.error("❌ Error in bullmq:", error);
      throw error;
    }
    console.log("========== WORKER COMPLETE ==========\n");
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs concurrently
  }
);

// Keep worker alive
worker.on("ready", () => {
  console.log("✅ Worker is ready and listening...");
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} (${job.name}) completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} (${job?.name}) failed:`, err?.message);
});

worker.on("active", (job) => {
  console.log(`🔄 Job ${job.id} (${job.name}) is now active`);
});

myQueue.on("error", (err) => {
  console.error("❌ Queue error:", err);
});

console.log("🚀 Worker initialized and listening on queue: careworks-queue");

// Export worker to keep it in memory
export { worker, myQueue };
