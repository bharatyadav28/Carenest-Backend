import { NextFunction, Request, Response } from "express";

const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Error: ", error);
  return res.status(500).json({ message: error.message });
};

export default errorMiddleware;
