import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); //{validateBeforeSave:false} its for that to save the data without validation otherwise model expect the ohter data to store.

        return { accessToken, refreshToken }

    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating the Access & Refresh tokens!!");
    }
}

//+++++++++++++Register Feathure++++++++++++++++
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

//+++++++++++++Login Feathure++++++++++++++++++
const loginUser = asyncHandler(async (req, res) => {
    //extrect the form body

    const { username, email, password } = req.body;

    //checking the is data validate user and email password

    if (!username && !email) { //here,we expecting that username and email are required
        throw new ApiError(400, "username OR email is required!!")
    }

    //find the user in database

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "User Does Not Exist!!");
    }

    //is it valid user to cheking password

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials!!");
    }

    //generate access and refresh token for them
    //-It's most commont task to generate it that's why we make one seperate file for the same in this file and we just call it.

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    //now we can send direct response but we loggedin to user by cheking it but completely based our requirement because it's database call.

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }
    //this is the option of the our cookie to  prevent the modify from the user side

    //send res with cookie

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User loggedin successfully!!"
            )
        )
    // here,we send token in the json data too,bcz this backend also for the mobile apps so there is no web token so we send in it.
})

//+++++++++++++Logout Feathure++++++++++++++++

const logoutUser = asyncHandler(async (req, res) => {
    //now we have access of the user in req by middleware and find that user.

    //findByIdAndUpdate - it's used for finding and updeting directly otherwise we find user and modify and save it long process so we it's better.
    User.findByIdAndUpdate(
        req.user?._id,
        {

            $set: { refreshToken: undefined } //it's set the value in db
        },
        {
            new: true            //for it give new updated value otherwise in response it give the previous old value.
        }
    )

    //Now, in DB we cleared but now we clear on the response so...

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "Loggedout Successfully!!")
        )
})

//++++++++++++regenreting the tokens while session expired +++++++++

const refreshAccessToken = asyncHandler(async (req, res) => {
    //We extract reftoken from our req body and cookie
    const { incomingRefreshToken } = req.body?.refreshToken || req.cookies?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request!!");
    }

    //we decode it and get the value of that user 
    const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    //find that user based on id by that id

    const user = await User.findById(decodedRefreshToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token!!")
    }

    //Check that the user sended and our db refresh token are same

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Invalid refresh token that is expired or used")
    }

    //generate new tokens for tham or extend session by calling our maded function that genrete tokens

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id)

    //sending response with new tokens and make it route for it in routefile.
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { accessToken, refreshToken }, "Session is extend by refreshing token"))
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

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage
}

