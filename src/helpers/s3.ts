import { Request } from "express";
import multer, { FileFilterCallback } from "multer";

import S3 from "aws-sdk/clients/s3";
import sharp from "sharp";

import { generateUniqueId } from "./utils";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_BUCKET_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

const isBucketConfigured =
  accessKeyId && secretAccessKey && region && bucketName;

const s3 = new S3({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: "v4",
});

export const s3Uploadv4 = async (
  file: Express.Multer.File,
  folder: string,
  type = null
) => {
  if (!isBucketConfigured) {
    throw new Error("AWS S3 bucket is not configured properly");
  }
  if (!file || (!type ? !file.mimetype : false)) {
    throw new Error("Invalid file input");
  }

  const fileType = file.mimetype?.split("/")[0]; // Extract file type (image, video, etc.)
  const extension = file.originalname?.split(".")?.pop(); // Extract file extension
  const timestamp = Date.now().toString();
  let key, body, contentType;

  const uuid = generateUniqueId();
  const folderName = folder || "uploads";
  key = `${folderName}/${uuid}`;

  if (fileType === "image") {
    // Convert image to WebP for optimization
    key = `${key}.webp`;
    body = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
    contentType = "image/webp";
  } else if (type === "invoice") {
    key = `${key}.pdf`;
    (body = file), (contentType = "application/pdf");
  } else {
    // Handle other file types dynamically

    body = file.buffer;
    contentType = file.mimetype; // Use original content type
  }

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  const data = await s3.upload(params).promise();
  data.Location = data.Key;
  return data;
};

// Define the array of blocked MIME types
const blockedMimeTypes = ["application/x-msdownload", "application/x-sh"];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const type = file.mimetype.split("/")[0];

  if (
    (type === "image" || type === "application" || type === "video") &&
    !blockedMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
  }
};

// Set up storage
const storage = multer.memoryStorage();

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 100, files: 4 }, // 100MB
});
