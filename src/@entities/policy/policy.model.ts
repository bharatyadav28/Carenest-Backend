import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Define allowed policy types
export const PolicyType = {
  PRIVACY: "privacy",
  TERMS: "terms",
  LEGAL: "legal"
} as const;

export type PolicyType = typeof PolicyType[keyof typeof PolicyType];

export const PolicyModel = pgTable("policies", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  type: varchar("type", { length: 50 }).notNull().unique(), // privacy, terms, legal

  content: text("content").notNull(),

  ...min_timestamps,
});

export const createOrUpdatePolicySchema = z.object({
  type: z.enum([PolicyType.PRIVACY, PolicyType.TERMS, PolicyType.LEGAL]),
  content: z.string().trim().min(1, "Content is required"),
});

export const getPolicyByTypeSchema = z.object({
  type: z.enum([PolicyType.PRIVACY, PolicyType.TERMS, PolicyType.LEGAL]),
});