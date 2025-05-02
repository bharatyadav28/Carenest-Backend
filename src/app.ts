import express, { Request, Response } from "express";
import { db } from "./db";
import { testUsers } from "./db/schema";

const app = express();

app.use(express.json());

app.post("/user", async (req: Request, res: Response) => {
  try {
    const user = await db.insert(testUsers).values(req.body).returning();
    return res.status(200).json({
      success: true,
      message: "user created successfully",
      user,
    });
  } catch (error) {
    console.log("Error:", error);
  }
});

app.get("/user", async (req: Request, res: Response) => {
  try {
    const users = await db.select().from(testUsers);
    return res.status(200).json({
      success: true,
      message: "user created successfully",
      users,
    });
  } catch (error) {
    console.log("Error:", error);
  }
});

export default app;
