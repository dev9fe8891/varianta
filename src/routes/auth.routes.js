import { Router } from "express";
import validate from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validation/auth.schema.js";
import { requireAuth } from "../middleware/auth.js";
import { register, login, logout, me } from "../controllers/auth.controller.js";
import { loginLimiter, registerLimiter } from "../config/rate-limiters.js";

const router = Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
