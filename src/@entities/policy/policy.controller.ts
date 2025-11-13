import { Request, Response } from "express";
import { PolicyModel, PolicyType, createOrUpdatePolicySchema, getPolicyByTypeSchema } from "./policy.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export const createOrUpdatePolicy = async (req: Request, res: Response) => {
  try {
    const { type, content } = req.cleanBody;

    // Check if policy already exists for this type
    const existingPolicy = await db.query.PolicyModel.findFirst({
      where: eq(PolicyModel.type, type),
    });

    let result;

    if (existingPolicy) {
      // Update existing policy
      result = await db
        .update(PolicyModel)
        .set({
          content,
          updatedAt: new Date(),
        })
        .where(eq(PolicyModel.type, type))
        .returning();

      if (result?.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Policy update failed",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Policy updated successfully",
        data: {
          policy: result[0],
        },
      });
    } else {
      // Create new policy
      result = await db
        .insert(PolicyModel)
        .values({
          type,
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (result?.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Policy creation failed",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Policy created successfully",
        data: {
          policy: result[0],
        },
      });
    }
  } catch (error) {
    console.error("Create or update policy error:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        message: "Policy type already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getPolicyByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validate type
    const validationResult = getPolicyByTypeSchema.safeParse({ type });
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy type. Must be one of: privacy, terms, legal",
      });
    }

    const policy = await db.query.PolicyModel.findFirst({
      where: eq(PolicyModel.type, type),
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: `Policy of type '${type}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy fetched successfully",
      data: {
        policy,
      },
    });
  } catch (error) {
    console.error("Get policy by type error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllPolicies = async (req: Request, res: Response) => {
  try {
    const policies = await db.select().from(PolicyModel);

    return res.status(200).json({
      success: true,
      message: "All policies fetched successfully",
      data: {
        policies,
        count: policies.length,
      },
    });
  } catch (error) {
    console.error("Get all policies error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deletePolicy = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validate type
    const validationResult = getPolicyByTypeSchema.safeParse({ type });
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy type. Must be one of: privacy, terms, legal",
      });
    }

    const existingPolicy = await db.query.PolicyModel.findFirst({
      where: eq(PolicyModel.type, type),
    });

    if (!existingPolicy) {
      return res.status(404).json({
        success: false,
        message: `Policy of type '${type}' not found`,
      });
    }

    const deletedPolicy = await db
      .delete(PolicyModel)
      .where(eq(PolicyModel.type, type))
      .returning();

    if (deletedPolicy?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Policy deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy deleted successfully",
      data: {
        policy: deletedPolicy[0],
      },
    });
  } catch (error) {
    console.error("Delete policy error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};