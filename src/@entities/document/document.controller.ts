import { Request, Response } from "express";

import { db } from "../../db";
import { DocumentModel } from "./document.model";
import { BadRequestError } from "../../errors";
import { s3Uploadv4 } from "../../helpers/s3";
import { cdnURL, getURLPath } from "../../helpers/utils";
import { eq } from "drizzle-orm";

export const uploadGiversDocuments = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError("Please upload an file");
  }

  const folder = "documents";
  const uploadResult = await s3Uploadv4(req.file, folder);

  // Generate image URL
  const result = `${cdnURL}/${uploadResult.Key}`;

  return res.status(200).json({
    success: true,
    message: "Document uploaded successfully",
    data: { url: result },
  });
};

export const saveCaregiverDocuments = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const documents = req.body.documents;

  if (!documents || !Array.isArray(documents)) {
    return res.status(400).json({ error: "Invalid documents format" });
  }

  const formattedDocuments = documents.map((doc: any) => {
    if (!doc.type || !doc.fileUrl) {
      throw new Error("Document type and file URL are required");
    }
    return {
      userId,
      type: doc.type,
      fileUrl: getURLPath(doc.fileUrl),
    };
  });

  const savedDocuments = await db
    .insert(DocumentModel)
    .values(formattedDocuments)
    .returning();

  return res.status(201).json({
    success: true,
    message: "Documents saved successfully",
    data: { savedDocuments },
  });
};

export const getCaregiverDocuments = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const documents = await db
    .select()
    .from(DocumentModel)
    .where(eq(DocumentModel.userId, userId));

  return res.status(200).json({
    success: true,
    message: "Documents retrieved successfully",
    data: { documents },
  });
};
