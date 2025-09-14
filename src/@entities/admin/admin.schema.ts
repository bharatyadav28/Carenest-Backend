import { zip } from "lodash";
import z from "zod";

export const addGiverSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.string().email().max(255),
  mobile: z.string().max(15).optional(),
  address: z.string().optional(),
  zipcode: z.number().int(),
  gender: z.string().max(255).optional(),
});
