import express from "express";

import { auth, isGiver } from "../../middlewares/auth";
import { addView, getViewsByGiver } from "./views.controller";

const viewsRouter = express.Router();

viewsRouter.route("/:id").post(auth, addView);

viewsRouter.route("/").get(isGiver, getViewsByGiver);

export default viewsRouter;
