import { Router } from "express";
import {
  register,
  login,
  updateProfile,
  logout,
  changePassword,
  refreshAccessToken
} from "../controllers/user.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";
const router = Router();



router.route("/register").post(register)
router.route("/login").post(login)
router.route("/updateProfile").post(userAuth,updateProfile)
router.route("/logout").post(userAuth,logout)
router.route("/change-Password").post(userAuth,changePassword)
router.route("/refresh-token").post(refreshAccessToken)
export default router;