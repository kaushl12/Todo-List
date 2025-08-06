import { Router } from "express";
import {
  register,
  login,
  updateProfile,
  logout,
} from "../controllers/user.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";
const router = Router();



router.route("/register").post(register)
router.route("/login").post(login)
router.route("/updateProfile").post(userAuth,updateProfile)
router.route("/logout").post(userAuth,logout)
export default router;