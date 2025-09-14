// src/controllers/user.controller.js

import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {  z } from "zod";
import jwt from "jsonwebtoken";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";


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
  fullName: z
    .string()
    .trim()
    .min(4)
    .max(30)
    .regex(/^[a-zA-Z\s]+$/, "Fullname must only contain letters and spaces"),
});

const loginSchema = z.object({
  email: registerSchema.shape.email,
  password: registerSchema.shape.password,
});
const updateSchema = z.object({
  email: registerSchema.shape.email.optional(),
  fullName: registerSchema.shape.fullName.optional(),
  username: registerSchema.shape.username.optional(),
});


const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
};

/* Token generator */
const generateRefreshAndAccessToken = async (user) => {
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

  const { email, username, password, fullName } = validated.data;

  const existedUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  
  const newUser = await User.create({
    email,
    username: username.toLowerCase(),
    password,
    fullName,
  });
  const uploadedAvatar  = await uploadOnCloudinary(avatarLocalPath, {
  folder: `user/${newUser._id}/avatar`,
});
  if (!uploadedAvatar  || !uploadedAvatar .secure_url || !uploadedAvatar .public_id) {
    throw new ApiError(400, [], "Failed to upload avatar to cloud");
  }

   newUser.avatar = {
    url: uploadedAvatar .secure_url,
    public_id: uploadedAvatar.public_id,
  };
   await newUser.save({ validateBeforeSave: false });

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

  const { accessToken, refreshToken } = await generateRefreshAndAccessToken(
    user
  );

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
  const parsedData = updateSchema.safeParse(req.body);
  if(!parsedData.success){
   throw new ApiError(401, "Invalid Data format", parsedData.error.issues);
  }

  const updates=parsedData.data;

  Object.keys(updates).forEach((key)=>{
    updates[key]=== undefined && delete updates[key]
  })

  if(updates.email){
    const exists=await User.findOne({email:updates.email})
    if(exists && exists._id.toString() !== req.user._id.toString()){
      return res.status(400).json({message :"An account with this email already exists"})
    }
  }
  if(updates.username){
    const exists=await User.findOne({username:updates.username})
    if(exists && exists._id.toString() !== req.user._id.toString()){
      return res.status(400).json({message : "An account with this username already exists"})
    }
  }

  try {
    const user=await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: updates
      },
      {new :true,runValidators:true}

    ).select("-password -refreshToken")
    if(!user){
       return res.status(404).json({ message: "User not found" });
    }
    return res.status(200)
    .json( new ApiResponse(200,user,"Account details Updated Successfully"))
  } catch (error) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `${field} already in use` });
    }
    throw err; 
  }
});
const passwordSchema = z.object({
  oldPassword: z.string(),

  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100, "New password must be at most 100 characters")
    .regex(/[0-9]/, "New password must contain at least one digit")
    .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
    .regex(
      /[$&+,:;=?@#|'<>.^*()%!-]/,
      "New password must contain at least one special character"
    ),
});
const changePassword = asyncHandler(async (req, res) => {
  const validatedPassword = passwordSchema.safeParse(req.body);
  if (!validatedPassword.success) {
    return res.status(400).json({
      message: "Invalid password format",
      error: validatedPassword.error.issues,
    });
  }

  const { oldPassword, newPassword } = validatedPassword.data;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const logout = asyncHandler(async (req, res) => {
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
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Access");
    }

    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired");
    }

    const { accessToken, refreshToken } = await generateRefreshAndAccessToken(
      user._id
    );
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched suucessfully");
});

const updateUserAvatar=asyncHandler(async(req,res)=>{
  console.log("Uploaded file:", req.file);

    const avatarLocalPath=req.file?.path
    const mime=req.file?.mime
    const size=req.file?.size
    if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is missing")
    }
  
    const MAX_MB = 5;

    if (typeof size === "number" && size > MAX_MB * 1024 * 1024) {
    try { await fs.unlink(avatarLocalPath); } catch {}
    throw new ApiError(400, `Image is too large. Max ${MAX_MB} MB.`);
  }
   const user=await User.findById(req.user?._id);
    if(!user){
      try {
        await fs.unlink(avatarLocalPath)
      } catch (error) {}
     throw new ApiError(401, "Not authenticated.");
    }

    const avatarUpload= await uploadOnCloudinary(avatarLocalPath, {
  folder: `user/${req.user._id}/avatar`,   // e.g. user/64abf1c9/avatar
  resource_type: "image",
});
    if(!avatarUpload?.secure_url || !avatarUpload?.public_id){
      try { await fs.unlink(avatarLocalPath); } catch {}
       throw new ApiError(400, "Error while uploading new avatar");
    }
   
    if(user.avatar?.public_id){
      await deleteFromCloudinary(user.avatar?.public_id)
    }
    user.avatar={
      url:avatarUpload.secure_url,
      public_id:avatarUpload.public_id
    }
      await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
})


export {
  register,
  login,
  updateProfile,
  logout,
  changePassword,
  refreshAccessToken,
  updateUserAvatar,
  getCurrentUser,
};
