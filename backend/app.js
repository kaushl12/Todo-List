import morgan from "morgan";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev")); 
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    statusCode: err.statusCode || 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

  export { app };