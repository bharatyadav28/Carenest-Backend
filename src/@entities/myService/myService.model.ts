import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

import { UserModel } from "../user/user.model";
import { ServiceModel } from "../service/service.model";

export const MyServiceModel = pgTable("my_service", {
  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  serviceId: varchar("service_id", { length: 21 })
    .notNull()
    .references(() => ServiceModel.id),
});

export const createMyServiceSchema = z.object({
  userId: z.string().trim().max(21),
  serviceId: z.string().trim().max(21),
});
