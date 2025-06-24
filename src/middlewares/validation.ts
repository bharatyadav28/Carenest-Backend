import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import _ from "lodash";

export function validateData(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    schema.parse(req.body);
    req.cleanBody = _.pick(req.body, Object.keys(schema.shape));
    next();
  };
}
