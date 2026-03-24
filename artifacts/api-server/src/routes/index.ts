import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import savesRouter from "./saves";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(savesRouter);

export default router;
