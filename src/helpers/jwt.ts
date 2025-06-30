import jwt from "jsonwebtoken";
import { payloadType } from "../types/general-types";

const minTime = 60 * 60 * 24;
// const minTime =  10;

const maxTime = 60 * 60 * 24 * 7;
// const maxTime = 1000 * 10;

const tempTime = 60 * 5; //  5 min

export const generateAccessToken = (payload: payloadType) => {
  const secret = process.env.ACCESS_SECRET;
  if (secret) {
    const token = jwt.sign(payload, secret, {
      expiresIn: minTime,
    });
    return token;
  }
  return null;
};

export const generateRefreshToken = (payload: payloadType) => {
  const secret = process.env.REFRESH_SECRET;
  if (secret) {
    const token = jwt.sign(payload, secret, {
      expiresIn: maxTime,
    });
    return token;
  }
  return null;
};

export const generateTempToken = (payload: payloadType) => {
  const secret = process.env.TEMP_SECRET;
  if (secret) {
    const token = jwt.sign(payload, secret, {
      expiresIn: tempTime,
    });
    return token;
  }
  return null;
};

export const verifyJWTToken = (token: string, tokenType?: string) => {
  const secret =
    tokenType === "refresh"
      ? process.env.REFRESH_SECRET
      : tokenType === "temporary"
      ? process.env.TEMP_SECRET
      : process.env.ACCESS_SECRET;

  if (secret) {
    const payload = jwt.verify(token, secret);
    return payload;
  }
  return null;
};
