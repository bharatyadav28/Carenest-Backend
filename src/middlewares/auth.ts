import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../errors";
import { generateAccessToken, verifyJWTToken } from "../helpers/jwt";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { UserModel } from "../db/schema";
import { getTokenPayload } from "../helpers/utils";
import { getAuthUser } from "../@entities/user/user.service";

export const auth = async (req: Request, _: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const existingUser = await getAuthUser(authHeader);
  console.log("Hi");
  req.user = existingUser;
  next();
};

export const isGiver = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const existingUser = await getAuthUser(authHeader, "giver");
  req.user = existingUser;
  next();
};

export const isAdmin = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const existingUser = await getAuthUser(authHeader, "admin");
  req.user = existingUser;
  next();
};

export const getNewAccessToken = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")?.[1];
  if (!refreshToken) {
    throw new BadRequestError("No refresh token found");
  }

  const payload = verifyJWTToken(refreshToken, "refresh");
  if (payload && typeof payload === "object" && "user" in payload) {
    const { user, exp } = payload;
    const userId = user?.id;

    const existingUser = await db.query.UserModel.findFirst({
      where: and(eq(UserModel.id, userId), eq(UserModel.isDeleted, false)),
      columns: {
        id: true,
        role: true,
      },
    });
    if (!existingUser || !exp) {
      throw new BadRequestError("User not found");
    }

    const hasTokenExpired = Date.now() >= exp * 1000;
    if (hasTokenExpired) {
      throw new BadRequestError("Your session is expired, please login");
    }
    const freshPayload = getTokenPayload(userId);
    const accessToken = generateAccessToken(freshPayload);
    return res.status(200).json({
      success: true,
      message: "Access token created sucessfully",
      data: {
        accessToken,
      },
    });
  }
};
