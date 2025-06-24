import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { DrizzleError } from "drizzle-orm";

interface CustomError extends Error {
  statusCode?: number;
  code?: string | number;
  detail?: string;
  keyValue?: Record<string, any>;
}

const errorMiddleware = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("\nError", error);

  const customError = {
    message: error.message || "Internal Server Error",
    statusCode: error.statusCode || 500,
  };

  // Handle Multer upload errors
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      customError.message = "File size is too large";
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      customError.message = "File limit reached";
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      customError.message = "Unexpected file type";
    }
    customError.statusCode = 400; // Bad Request
  }

  // Handle Zod validation errors (Drizzle Pod uses Zod)
  if (error instanceof z.ZodError) {
    customError.message = error.errors
      .map((err) => `${err.path.join(".")} is ${err.message}`)
      .join(", ");
    customError.statusCode = 400; // Bad Request
  }

  // Handle Drizzle errors
  if (error instanceof DrizzleError) {
    customError.message = `Database Error: ${error.message}`;
    customError.statusCode = 500; // Internal Server Error
  }

  // Handle PostgreSQL unique constraint violation (similar to Mongoose duplicate key)
  if (error.code === "23505") {
    const match = error.detail?.match(/Key \((.*?)\)=/);
    const field = match ? match[1] : "field";
    customError.message = `Duplicate value entered for ${field}`;
    customError.statusCode = 400; // Bad Request
  }

  // Handle PostgreSQL foreign key constraint violation
  if (error.code === "23503") {
    customError.message = `Foreign key constraint failed: ${
      error.detail || ""
    }`;
    customError.statusCode = 400; // Bad Request
  }

  // Handle MySQL duplicate entry errors
  if (error.code === "ER_DUP_ENTRY") {
    const match = error.message.match(/Duplicate entry .* for key '(.*)'/);
    const field = match ? match[1] : "field";
    customError.message = `Duplicate value entered for ${field}`;
    customError.statusCode = 400; // Bad Request
  }

  // Handle MySQL foreign key constraint errors
  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_ROW_IS_REFERENCED_2"
  ) {
    customError.message = `Foreign key constraint failed`;
    customError.statusCode = 400; // Bad Request
  }

  // Handle not found errors
  if (
    error.message?.includes("not found") ||
    error.message?.includes("No rows returned") ||
    error.code === "RESOURCE_NOT_FOUND"
  ) {
    customError.message = error.message || "Resource not found";
    customError.statusCode = 404; // Not Found
  }

  return res.status(customError.statusCode).json({
    success: false,
    message: customError.message,
  });
};

export default errorMiddleware;
