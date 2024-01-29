import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {

    //1 - get user details from the frontend 

    const { userName, fullName, email, password } = req.body;

    //2 - validation
    if ([userName, fullName, email, password].some((field) => field.trim() === "")) {
        throw new ApiError(400, "All field are required!!")
    }


    //3 - check user already exist with field : username,email

    const existingUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existingUser) {
        throw new ApiError(409, `User with ${email || "email"} and ${userName || "Username"} is already exist!!`);
    }

    //4 - check images & avatar

    const avtarLoaclPath = req.files?.avatar[0]?.path;
    const coverImageLoacalPath = req.files?.coverImage ? req.files?.coverImage[0]?.path : "";

    if (!avtarLoaclPath) {
        throw new ApiError(400, "Avtar image is required");
    }

    //5 - uploade it on cloudinary

    const avatarRes = await uploadOnCloudinary(avtarLoaclPath);
    const coverImgRes = coverImageLoacalPath ? await uploadOnCloudinary(coverImageLoacalPath) : "";

    if (!avatarRes) {
        throw new ApiError(400, "Avtar image is required");
    }
    //6 -create user object of it whole data to store in db

    const userCreate = await User.create({
        fullName,
        userName: userName.toLowerCase(),
        avatar: avatarRes?.url,
        coverImage: coverImgRes?.url || "",
        email,
        password
    })
    //7 -send to user response it's data after removing password and refreshtoken

    const isUserCreated = await User.findById(userCreate._id).select(
        "-password -refreshToken"
    )

    //8 -check it , is user created 

    if (!isUserCreated) {
        throw new ApiError(500, "Internal server error while creating user!!")
    }

    //9 -return response

    return res.status(201).json(new ApiResponse(200, isUserCreated, "User Created Successfully!!"))

})

export { registerUser }