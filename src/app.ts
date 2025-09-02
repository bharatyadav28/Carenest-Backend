process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "1";

import express, { Response } from "express";
import "dotenv/config";
import "express-async-errors";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import chalk from "chalk";

import errorMiddleware from "./middlewares/error";
import pageNotFound from "./middlewares/pageNotFound";
import "./helpers/redis-client";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

const istLogger = morgan((tokens, req, res) => {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });

  return [
    chalk.blue(`[${istTime}]`),
    chalk.green(tokens.method(req, res)),
    chalk.magenta(tokens.url(req, res)),
    chalk.yellow(tokens.status(req, res)),
    chalk.white("-"),
    chalk.red(`${tokens["response-time"](req, res)} ms`),
  ].join(" ");
});
app.use(istLogger);

app.get("/", (_, res: Response) =>
  res.sendFile(path.join(__dirname, "../public", "index.html"))
);

import { userRouter } from "./@entities/user";
import { getNewAccessToken, isGiver } from "./middlewares/auth";
import { giverRouter } from "./@entities/giver";
import { jobProfileRouter } from "./@entities/jobProfile";
import { aboutRouter } from "./@entities/about";
import { whyChooseMeRouter } from "./@entities/whyChooseMe";
import { serviceRouter } from "./@entities/service";
import { myServiceRouter } from "./@entities/myService";
import { documentRouter } from "./@entities/document";
import { planRouter } from "./@entities/plan";
import { adminRouter } from "./@entities/admin";
import { trimStringFields } from "./middlewares/trim";
import BookingRouter from "./@entities/booking/booking.routes";
import { messageRouter } from "./@entities/message";
import sendEmail from "./helpers/sendEmail";
import { getDocumentUploadReminderHTML } from "./helpers/emailText";
import viewsRouter from "./@entities/views/views.routes";
import { bookmarkRouter } from "./@entities/bookmark";

// app.use("/api", trimStringFields);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/giver", giverRouter);
app.use("/api/v1/job-profile", isGiver, jobProfileRouter);
app.use("/api/v1/about", isGiver, aboutRouter);
app.use("/api/v1/why-choose-me", isGiver, whyChooseMeRouter);
app.use("/api/v1/service", serviceRouter);
app.use("/api/v1/my-service", isGiver, myServiceRouter);
app.use("/api/v1/document", documentRouter);
app.use("/api/v1/plan", planRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/booking", BookingRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/views", viewsRouter);
app.use("/api/v1/bookmarks", bookmarkRouter);

app.get("/api/v1/email-test", async (_, res: Response) => {
  try {
    await sendEmail({
      to: "test@gmail.com",
      subject: "Welcome to careworks!",
      html: getDocumentUploadReminderHTML(),
    });
    return res.status(200).json({
      success: true,
      message: "Email sent successfully!",
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/v1/new-access-token", getNewAccessToken);

app.use(pageNotFound);
app.use(errorMiddleware);

export default app;
