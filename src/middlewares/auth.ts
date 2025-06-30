import { NextFunction, Request, Response } from "express";
import BadRequestError from "../errors/bad-request";
import { generateAccessToken, verifyJWTToken } from "../helpers/jwt";
import { payloadType } from "../types/general-types";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { UserModel } from "../db/schema";
import { getTokenPayload } from "../helpers/utils";
import NotFoundError from "../errors/not-found";

export const auth = async (req: Request, _: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const accessToken = authHeader && authHeader.split(" ")?.[1];
  if (!accessToken) {
    throw new BadRequestError("Access token missing");
  }

  const payload = verifyJWTToken(accessToken);

  if (payload && typeof payload === "object" && "user" in payload) {
    const userId = payload.user.id;
    const existingUser = await db.query.UserModel.findFirst({
      where: and(eq(UserModel.id, userId), eq(UserModel.isDeleted, false)),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    req.user = existingUser;
    next();
  } else {
    throw new BadRequestError("Invalid token payload");
  }
};

export const isGiver = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const role = req?.user?.role;
  if (!role || role !== "giver") {
    throw new BadRequestError("Forbidden:Caregivers Only");
  }
  next();
};

export const isAdmin = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const role = req?.user?.role;
  if (!role || role !== "admin") {
    throw new BadRequestError("Forbidden:Admin Only");
  }
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
