import { Request, Response } from "express";
import { db } from "../../db";
import { DocumentModel } from "./document.model";
import { BadRequestError } from "../../errors";
import { s3Uploadv4 } from "../../helpers/s3";
import { cdnURL, getURLPath } from "../../helpers/utils";
import { and, eq, desc } from "drizzle-orm";



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

  // Check for existing documents by type
  for (const doc of documents) {
    if (!doc.type || !doc.fileUrl) {
      throw new Error("Document type and file URL are required");
    }

    // For resume and work_permit, check if user already has one
    if (doc.type === 'resume' || doc.type === 'work_permit') {
      const existingDoc = await db
        .select()
        .from(DocumentModel)
        .where(
          and(
            eq(DocumentModel.userId, userId),
            eq(DocumentModel.type, doc.type)
          )
        )
        .limit(1);

      if (existingDoc.length > 0) {
        throw new BadRequestError(`You already have a ${doc.type.replace('_', ' ')} uploaded`);
      }
    }
  }

  const formattedDocuments = documents.map((doc: any) => {
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



// Get work permit (specific type)
export const getCaregiverWorkPermit = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const workPermit = await db
    .select()
    .from(DocumentModel)
    .where(
      and(
        eq(DocumentModel.userId, userId),
        eq(DocumentModel.type, 'work_permit')
      )
    )
    .limit(1);

  return res.status(200).json({
    success: true,
    message: "Work permit retrieved successfully",
    data: { workPermit: workPermit[0] || null },
  });
};

// Get resume (specific type)
export const getCaregiverResume = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const resume = await db
    .select()
    .from(DocumentModel)
    .where(
      and(
        eq(DocumentModel.userId, userId),
        eq(DocumentModel.type, 'resume')
      )
    )
    .limit(1);

  return res.status(200).json({
    success: true,
    message: "Resume retrieved successfully",
    data: { resume: resume[0] || null },
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

// Update existing document (for resume and work_permit)
export const updateCaregiverDocument = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { type, fileUrl } = req.body;

  if (!type || !fileUrl) {
    throw new BadRequestError("Please provide type and file URL");
  }

  // Only allow resume and work_permit for update
  if (type !== 'resume' && type !== 'work_permit') {
    throw new BadRequestError("Only resume and work permit can be updated");
  }

  // Check if document exists
  const existingDoc = await db
    .select()
    .from(DocumentModel)
    .where(
      and(
        eq(DocumentModel.userId, userId),
        eq(DocumentModel.type, type)
      )
    )
    .limit(1);

  let result;
  if (existingDoc.length > 0) {
    // Update existing
    result = await db
      .update(DocumentModel)
      .set({
        fileUrl: getURLPath(fileUrl),
        createdAt: new Date(),
      })
      .where(
        and(
          eq(DocumentModel.userId, userId),
          eq(DocumentModel.type, type)
        )
      )
      .returning();
  } else {
    // Create new
    result = await db
      .insert(DocumentModel)
      .values({
        userId,
        type,
        fileUrl: getURLPath(fileUrl),
      })
      .returning();
  }

  return res.status(200).json({
    success: true,
    message: `${type.replace('_', ' ')} ${existingDoc.length > 0 ? 'updated' : 'created'} successfully`,
    data: { document: result[0] },
  });
};