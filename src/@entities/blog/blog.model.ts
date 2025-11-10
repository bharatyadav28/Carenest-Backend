import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const BlogModel = pgTable("blogs", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  mainImage: varchar("main_image", { length: 500 }).notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description").notNull(),

  authorName: varchar("author_name", { length: 255 }).notNull(),

  authorProfilePic: varchar("author_profile_pic", { length: 500 }),

  blogDate: timestamp("blog_date").notNull(),

  content: text("content").notNull(),

  ...min_timestamps,
});

export const createBlogSchema = z.object({
  mainImage: z.string().url(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  authorName: z.string().trim().min(1).max(255),
  authorProfilePic: z.string().url().optional().or(z.literal("")),
  blogDate: z.string().datetime(),
  content: z.string().trim().min(1),
});

export const updateBlogSchema = createBlogSchema.partial();