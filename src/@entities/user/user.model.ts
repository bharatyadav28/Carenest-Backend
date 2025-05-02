import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const testUsers = pgTable("test-user", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
});
