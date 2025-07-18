import express from "express";

import { addMyService, getMyServices } from "./myService.controller";

const myServiceRouter = express.Router();

myServiceRouter.route("/").get(getMyServices).put(addMyService);

export default myServiceRouter;
