import { z } from "zod";

import {
  roleEnum,
  createUserSchema,
  updateUserSchema,
} from "../@entities/user/user.model";

export type RoleType = (typeof roleEnum.enumValues)[number];

export type CreateUserType = z.infer<typeof createUserSchema>;
export type UpdateUserType = z.infer<typeof updateUserSchema>;
