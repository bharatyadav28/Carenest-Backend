import { z } from "zod";

import { roleEnum, createUserSchema } from "../db/schema";

export type RoleType = (typeof roleEnum.enumValues)[number];

export type CreateUserType = z.infer<typeof createUserSchema>;
