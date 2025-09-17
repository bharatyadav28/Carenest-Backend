import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().max(255).optional(),
  email: z.string().trim().email().max(255),
  isEmailVerified: z.boolean().default(false),
  password: z.string().trim().min(6).max(255).optional(),
  mobile: z.string().trim().max(15).optional(),
  address: z.string().trim().optional(),
  gender: z.string().trim().max(255).optional(),
  role: z.enum(["user", "giver", "admin"]).default("user"),
  avatar: z.string().trim().max(255).optional(),
  zipcode: z.number().int(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().max(255).optional(),
  gender: z.string().trim().max(255).optional(),
  address: z.string().trim().optional(),
  mobile: z.string().trim().max(15).optional(),
  zipcode: z.number().int().optional(),
});

export const createUserByAdminSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.email().max(255),
  mobile: z.string().max(15).optional(),
  address: z.string().optional(),
  zipcode: z.number().int(),
  gender: z.string().max(255).optional(),
  role: z.enum(["user", "giver"]).default("user"),
});

export const updateUserByAdminSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.email().max(255),
  mobile: z.string().max(15).optional(),
  address: z.string().optional(),
  zipcode: z.number().int(),
  gender: z.string().max(255).optional(),
});

export const signinUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().trim().min(1).max(255),
});
