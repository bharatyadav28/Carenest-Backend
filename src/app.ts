import express, { Response } from "express";
import "dotenv/config";
import "express-async-errors";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import chalk from "chalk";

import errorMiddleware from "./middlewares/error";
import pageNotFound from "./middlewares/pageNotFound";

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
// import { documentRouter } from "./@entities/document";
import { planRouter } from "./@entities/plan";
import { trimStringFields } from "./middlewares/trim";

app.use("/api", trimStringFields);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/giver", isGiver, giverRouter);
app.use("/api/v1/job-profile", isGiver, jobProfileRouter);
app.use("/api/v1/about", isGiver, aboutRouter);
app.use("/api/v1/why-choose-me", isGiver, whyChooseMeRouter);
app.use("/api/v1/service", serviceRouter);
app.use("/api/v1/my-service", isGiver, myServiceRouter);
// app.use("/api/v1/document", documentRouter);
app.use("/api/v1/plan", planRouter);

app.get("/api/v1/new-access-token", getNewAccessToken);

app.use(pageNotFound);
app.use(errorMiddleware);

export default app;
