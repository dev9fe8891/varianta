import { Router } from "express";
import validate from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validation/auth.schema.js";
import { register, login } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
