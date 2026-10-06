import { Router } from "express";
import validate from "../middleware/validate.js";
import { registerSchema } from "../validation/auth.schema.js";
import { register } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);

export default router;
