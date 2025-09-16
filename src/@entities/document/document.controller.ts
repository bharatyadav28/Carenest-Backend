import { Request, Response } from "express";

import { db } from "../../db";
import { DocumentModel } from "./document.model";
import { BadRequestError } from "../../errors";
import { s3Uploadv4 } from "../../helpers/s3";
import { cdnURL, getURLPath } from "../../helpers/utils";
import { and, eq } from "drizzle-orm";
import { fi } from "zod/v4/locales/index.cjs";
import { create } from "lodash";

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
    throw new BadRequestError("Please provide documents");
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

export const getCaregiverCertificates = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const certificates = await db
    .select({
      id: DocumentModel.id,
      fileUrl: DocumentModel.fileUrl,
      createdAt: DocumentModel.createdAt,
    })
    .from(DocumentModel)
    .where(
      and(
        eq(DocumentModel.type, "certificate"),
        eq(DocumentModel.userId, userId)
      )
    );

  return res.status(200).json({
    success: true,
    message: "Certificates retrieved successfully",
    data: { certificates },
  });
};

export const deleteCaregiverDocument = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const documentId = req.params.id;

  const deletedDocument = await db
    .delete(DocumentModel)
    .where(
      and(eq(DocumentModel.id, documentId), eq(DocumentModel.userId, userId))
    )
    .returning();

  if (deletedDocument.length === 0) {
    throw new BadRequestError(
      "Document not found or you do not have permission to delete it"
    );
  }

  return res.status(200).json({
    success: true,
    message: "Document deleted successfully",
  });
};

export const saveGiverCertificate = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const fileUrl = req.body.fileUrl;

  if (!fileUrl) {
    throw new BadRequestError("Please provide a file URL");
  }

  const formattedDocument = {
    userId,
    type: "certificate" as const,
    fileUrl: getURLPath(fileUrl),
  };

  const certificate = await db
    .insert(DocumentModel)
    .values(formattedDocument)
    .returning();

  if (!certificate || certificate.length === 0) {
    throw new BadRequestError("Failed to save certificate");
  }

  return res.status(201).json({
    success: true,
    message: "Certificate saved successfully",
  });
};
