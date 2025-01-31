import * as express from "express";
const router = express.Router();

import { userRoute } from "./users.route";

router.use("/users", userRoute);

export default router;  