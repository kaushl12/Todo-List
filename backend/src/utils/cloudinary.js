import { v2 as cloudinary } from "cloudinary";
import fs, { unlink } from "fs";
import {ApiError} from "./ApiError.js"
import { success } from "zod";

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

 const uploadOnCloudinary = async (localFilePath, options = {}) => {
  if (!localFilePath) throw new Error("File path not provided");

  try {
    // Upload with folder support
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: "user/avatar",   // 👈 default folder
      resource_type: "image",  // better than auto since you’re only uploading images
      ...options,              // allows overrides (e.g. custom folder)
    });

    // Always clean up local file after upload
    try {
      fs.unlinkSync(localFilePath);
    } catch (err) {
      console.warn("Failed to delete local file:", err);
    }

    console.log("✅ File Uploaded Successfully:", response.secure_url);
    return response;
  } catch (error) {
    // Cleanup even if upload fails
    try {
      await fs.promises.unlink(localFilePath);
    } catch {}
    throw new Error("Cloudinary upload failed: " + error.message);
  }
};

const deleteFromCloudinary=async(public_id,resource_type="image")=>{
  try {
      if(!public_id){
        throw new ApiError(400, "File identifier is missing");
      }
      const allowedTypes=['image']
      if(!allowedTypes.includes(resource_type)){
        throw new ApiError(400, "Unsupported file type");
      }
      const result=await cloudinary.uploader.destroy(public_id,{resource_type})

       if (result.result === "not found") {
      throw new ApiError(404, "File not found or already deleted");
    }
      
      if(result.result!== "ok"){
        throw new ApiError(500, "Unable to delete the file. Please try again.");
      }
      return {success:true,message: "File deleted successfully"}
  } catch (error) {
      console.error("Clouidnary deletion error: ",error)
      throw new ApiError(500, "Something went wrong while deleting the file");
  }
}

export { uploadOnCloudinary,deleteFromCloudinary  };
