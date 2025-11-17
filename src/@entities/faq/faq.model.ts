import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Schema for FAQ items (question-answer pairs)
const faqItemSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1), // Plain text only
});

export const FAQModel = pgTable("faqs", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // FAQ Type - dynamic string for different screens/pages
  faqType: varchar("faq_type", { length: 100 }).notNull(),

  // Section Title (optional - for grouping FAQs)
  sectionTitle: varchar("section_title", { length: 255 }),

  // Array of question-answer pairs
  faqItems: jsonb("faq_items").$type<z.infer<typeof faqItemSchema>[]>(),

  ...min_timestamps,
});

export const createFAQSchema = z.object({
  faqType: z.string().trim().min(1).max(100), // Dynamic type - any string allowed
  sectionTitle: z.string().trim().max(255).optional(),
  faqItems: z.array(z.object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1), // Plain text only
  })).min(1),
});

export const updateFAQSchema = createFAQSchema.partial();

// Schema for adding individual FAQ items
export const addFAQItemSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1),
});