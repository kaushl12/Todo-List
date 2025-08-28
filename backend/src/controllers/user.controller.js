// src/controllers/user.controller.js

import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { z } from "zod";

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z_]+$/,
      "Username must only contain letters and underscores"
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(8)
    .max(70)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),

  password: z
    .string()
    .min(6)
    .max(100)
    .regex(/[0-9]/, "Must contain at least one digit")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(
      /[$&+,:;=?@#|'<>.^*()%!-]/,
      "Must contain at least one special character"
    ),
});

const loginSchema = z.object({
  email: registerSchema.shape.email,
  password: registerSchema.shape.password,
});

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
};

/* Token generator */
const  generateRefreshAndAccessToken = async (user) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    console.error("Token Generation Error:", err.message);
    throw new ApiError(500, [], "Error generating refresh and access tokens");
  }
};

/* REGISTER */
const register = asyncHandler(async (req, res) => {
  const validated = registerSchema.safeParse(req.body);
  if (!validated.success) {
    return res.status(400).json({
      message: "Invalid registration data format",
      error: validated.error.issues,
    });
  }

  const { email, username, password } = validated.data;

  const existedUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const newUser = await User.create({
    email, 
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(newUser._id)
    .select("-password -refreshToken")
    .lean();

  if (!createdUser) {
    throw new ApiError(500, [], "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

/* LOGIN */
const login = asyncHandler(async (req, res) => {
  const validated = loginSchema.safeParse(req.body);
  if (!validated.success) {
    return res.status(400).json({
      message: "Invalid login data format",
      error: validated.error.issues,
    });
  }

  const { email, password } = validated.data;

  const user = await User.findOne({ email });

 
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, [], "Invalid email or password");
  }

  const { accessToken, refreshToken } = await generateRefreshAndAccessToken(user);

  const userData = await User.findById(user._id)
    .select("-password -refreshToken")
    .lean();

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: userData, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
});
  

/* UPDATE PROFILE */
const updateProfile = asyncHandler(async (req, res) => {
  res.send("updateProfile route under construction");
});


const logout=asyncHandler(async(req,res)=>{
  console.log("hi");
  
  console.log("user",req.user._id);
  
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
})

export { register, login, updateProfile,logout };
