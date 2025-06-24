import { boolean, timestamp } from "drizzle-orm/pg-core";
export const min_timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

export const timestamps = {
  ...min_timestamps,
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
};
