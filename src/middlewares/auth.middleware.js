import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    //Here (req,res,next) there is no use of the res so we can add "_" there.it's standard and recommended approch.
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") //we extrect token from the cookie for web OR header from the mobile where we passed both in our response.

        if (!token) {
            throw new ApiError(401, "Unauthorized request!!");
        }

        //decode the data for verify from the jwt who have access it.
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        //now we check the user by getting above data to calling the database.

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }

        //now we send the user in out reqest object by injecting in it like as...

        req.user = user  //as usual we put property in object
        next()        //for further task

    } catch (error) {

        throw new ApiError(401, error?.message || "Invalid access token")
    }

})