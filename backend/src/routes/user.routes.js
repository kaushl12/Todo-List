import { Router } from "express";
import {
  register,
  login,
  updateProfile,
} from "../controllers/user.controller.js";
const router = Router();

router.route("/register").post(register)
router.route("/login").post(login)
router.route("/updateProfile").post(updateProfile)
export default router;