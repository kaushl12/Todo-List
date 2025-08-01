import dotenv from "dotenv"

import {app} from './app.js'
import connectDb from './db/index.js';
            
dotenv.config({
    path:'./.env'
})

connectDb()
.then(()=>{
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`Server is running ar port : ${process.env.PORT}`);
    })
    app.on("error",(error)=>{
            console.log("Error",error)
        })
})
.catch((err)=>{
    console.log("MONGO Db connection failed!!",err);
    
})
/*
;(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Error",error)
        })

        app.listen(process.env.PORT)
    } catch (error) {
        console.error("ERROR",error)
        throw err
    }
})()*/
