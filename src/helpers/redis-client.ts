import { Queue, Worker } from "bullmq";
import { sendServiceReminderEmail } from "../@entities/booking/booking.service";
import { ConnectionOptions } from "bullmq";

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASS,
};

const myQueue = new Queue("careworks-queue", { connection });

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

const worker = new Worker(
  "careworks-queue",
  async (job) => {
    console.log("Worker", job.name);
    try {
      switch (job.name) {
        case "SendServiceReminder":
          await sendServiceReminderEmail({ bookingId: job.data.bookingId });
          break;
        case "docsUploadReminder":
          // Handle document upload reminder
          break;
      }
    } catch (error) {
      console.log("Error in bullmq: ", error);
    }
  },
  {
    connection,
  }
);

myQueue.on("error", (err) => {
  console.error("Queue error:", err);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});
