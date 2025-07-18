import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

import { UserModel } from "../user";
import { ServiceModel } from "../service";
import { createInsertSchema } from "drizzle-zod";

export const MyServiceModel = pgTable("my_service", {
  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  serviceId: varchar("service_id", { length: 21 })
    .notNull()
    .references(() => ServiceModel.id),
});

export const createMyServiceSchema = createInsertSchema(MyServiceModel);
