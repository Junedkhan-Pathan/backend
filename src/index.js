// import mongoose from "mongoose";
// import {DB_NAME} from './constants.js'
import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path: './env'
})



connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running on port : ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log(`MongoDB Connection failed`, err)
    })









    
/*
import express from 'express'
const app = express()
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
         app.on("ERROR:",(error)=>{
            console.log("Error in DB connection",error)
         })
         app.listen(`${process.env.PORT}`,()=>{
            console.log(`App listening on port: ${process.env.PORT}`)
         }) 
    } catch (error) {
        console.error("ERROR:", error);
        throw error
    }
})()

*/