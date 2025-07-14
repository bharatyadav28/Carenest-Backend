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
import { getNewAccessToken } from "./middlewares/auth";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/giver", userRouter);

app.get("/api/v1/new-access-token", getNewAccessToken);

app.use(pageNotFound);
app.use(errorMiddleware);

export default app;
