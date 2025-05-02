import express, { Request, Response } from "express";
import "dotenv/config";
import "express-async-errors";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import chalk from "chalk";

import { db } from "./db";
import { testUsers } from "./db/schema";
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
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/user", async (req: Request, res: Response) => {
  const users = await db.select().from(testUsers);
  return res.status(200).json({
    success: true,
    message: "user created successfully",
    users,
  });
});

// Notfound and error middlewares
app.use(pageNotFound);
app.use(errorMiddleware);

export default app;
