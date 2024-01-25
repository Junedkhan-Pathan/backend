import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("Response of the cloudinary file upload", response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //here ,we can use also unlink but for the better to
        //to use unlinkSync to syncronisly flow.
        //it's for to remove the locally stored file if the the uploading got failed. 
        return null
    }
}
export { uploadOnCloudinary }