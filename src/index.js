// import mongoose from "mongoose";
// import {DB_NAME} from './constants.js'
import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path: './env'
})


connectDB()

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