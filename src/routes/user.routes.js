import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser
)

router.route("/login").post(loginUser);

//++++secure route - for cheaking the is user autheticate to logout them.++++
router.route("/logout").post(verifyJWT, logoutUser) //here we add middleware that check is user authenticated and if it then we clear it's token and perform the logout functinality.
router.route("/refresh-token").post(refreshAccessToken)
export default router