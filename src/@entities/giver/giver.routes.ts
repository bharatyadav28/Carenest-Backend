import express from "express";

import { isGiver } from "../../middlewares/auth";
import { changePassword } from "./giver.controller";

const giverRouter = express.Router();

giverRouter.route("/change-password").put(isGiver, changePassword);

export default giverRouter;
