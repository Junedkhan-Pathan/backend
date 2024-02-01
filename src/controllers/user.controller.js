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

// ++++++++++++++++ Password Update feathure+++++++++++
const changeCurrentPassword = asyncHandler(async (req, res) => {

    //first we extrect data from req body and user id from the user object that inject by the middleware
    const { oldPassword, newPassword } = req?.body;

    const user = User.findById(req.user?._id)

    //now user have access the method of db that is isPasswordCorrect that give result that ispassword correct and if then we will update
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password!!")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    //now we send the suucess message to user

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully!!"))

})

//++++++++++++++ Get Current User ++++++++++++++
const getCurrentUser = asyncHandler(async (req, res) => {
    //it's too easy now because we alredy make the middleware that inject the user data in the route so we just send it from req.body
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully!!"))
})

//++++++++++++++ Update user account details ++++++++++++
const updateAccountDetails = asyncHandler(async (req, res) => {
    //it's completely depend on us which type details and field we gives user to update.
    //here, lets suppose we user update fullname and email

    const { fullName, email } = req?.body

    if (!fullName || !email) {
        throw new ApiError(401, "All fields are required!!")
    }

    //now we find in db by user._id and update by the method of findAndUpdate method

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully!!"))
})

//++++++++++++  Updated user avatar +++++++++++++++++++++

const updateUserAvatar = asyncHandler(async (req, res) => {
    //it's good to handle the file data seprete instant of together with account data because it's recommended and standard approch and to avoiding load on the network the text data with file.

    const avatarLoaclPath = req.file?.path; //that our multer middleware inject and we get this path

    if (!avatarLoaclPath) {
        throw new ApiError(400, "Avatar file is missing!!")
    }

    const avatar = await uploadOnCloudinary(avatarLoaclPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar!!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated sucessfully!!"))

})

//+++++++++ Update cover image +++++++++++++++++++++

const updateCoverImage = asyncHandler(async (req, res) => {
    //as same as avatart image..

    const coverImageLoaclPath = req.file?.path;

    if (!coverImageLoaclPath) {
        throw new ApiError(400, "Cover image file is missing!!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLoaclPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image!!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated sucessfully!!"))

})
export { registerUser, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateCoverImage }