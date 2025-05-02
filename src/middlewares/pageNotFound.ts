import { Request, Response } from "express";

const pageNotFound = (req: Request, res: Response) => {
  res.status(404).json({ message: "Route doesn't exist" });
};

export default pageNotFound;
