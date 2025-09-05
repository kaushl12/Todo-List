import { v2 as cloudinary } from "cloudinary";
import fs, { unlink } from "fs";
import {ApiError} from "./ApiError.js"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ans aysnc function
// accepts file path as a parameter
// checks that filepath is empty or not  if yes then throw error
//and theh upload the file on cloudinary make its resource type as auto or other according to use and return the response
//and in catch block write code for unlinking the file that not has been uploaded

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) throw new Error("File path not provided");

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

   fs.unlinkSync(localFilePath);

    console.log("File Uploaded Successfully", response.url);
    return response;
  } catch (error) {
    try {
      await fs.promises.unlink(localFilePath);
    } catch (error) {}
    throw new Error("Cloudinary upload failed: " + error.message);
  }
};

export { uploadOnCloudinary };
