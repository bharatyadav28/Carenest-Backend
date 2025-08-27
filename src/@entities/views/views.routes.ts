import express from "express";

import { isSeeker, isGiver } from "../../middlewares/auth";
import { addView, getViewsByGiver } from "./views.controller";

const viewsRouter = express.Router();

viewsRouter.route("/:id").post(isSeeker, addView);

viewsRouter.route("/").get(isGiver, getViewsByGiver);

export default viewsRouter;
