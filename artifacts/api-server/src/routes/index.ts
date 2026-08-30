import { Router, type IRouter } from "express";
import decisionsRouter from "./decisions";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decisionsRouter);

export default router;
