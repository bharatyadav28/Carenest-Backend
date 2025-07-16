import { z } from "zod";

import { roleEnum, createUserSchema, updateUserSchema } from "../db/schema";

export type RoleType = (typeof roleEnum.enumValues)[number];

export type CreateUserType = z.infer<typeof createUserSchema>;
export type UpdateUserType = z.infer<typeof updateUserSchema>;
