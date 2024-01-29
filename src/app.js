import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,

}))
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb" }))
app.use(express.static('public'))
app.use(cookieParser())


//routes files import
import userRouter from './routes/user.routes.js'; //here only we have to declare the
//one time to pass to control that's why we use middleware of it.

app.use("/api/v1/users",userRouter); //now we have declared and it pass to the user routes file
//further url check (whole url will be http..../users/register or /login etc..) 
//api/v1/users - it is standard practice to write the url to define version.



export { app }