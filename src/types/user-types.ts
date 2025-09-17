import { z } from "zod";

import { roleEnum } from "../@entities/user/user.model";
import { createUserSchema, updateUserSchema } from "../@entities/user";

export type RoleType = (typeof roleEnum.enumValues)[number];

export type CreateUserType = z.infer<typeof createUserSchema>;
export type UpdateUserType = z.infer<typeof updateUserSchema>;
