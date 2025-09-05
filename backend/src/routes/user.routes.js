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
import { upload } from './../middlewares/fileUpload.middleware.js';
const router = Router();



router.route("/register").post(upload.single('avatar'),register)
router.route("/login").post(login)
router.route("/updateProfile").patch(userAuth,updateProfile)
router.route("/logout").post(userAuth,logout)
router.route("/change-Password").post(userAuth,changePassword)
router.route("/refresh-token").post(refreshAccessToken)
export default router;