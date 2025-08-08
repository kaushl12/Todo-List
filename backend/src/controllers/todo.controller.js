import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { z } from "zod";
import { Todo } from "../models/todo.model.js";
import mongoose from "mongoose";
const todoUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "completed"]).optional(),
});
const todoSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  dueDate: z.preprocess(
    (val) => (val ? new Date(val) : undefined),
    z.date().optional()
  ),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["pending", "in-progress", "completed"]).default("pending"),
});
const createTodo = asyncHandler(async (req, res) => {
  const validated = todoSchema.safeParse(req.body);
  if (!validated) {
    const errorDetails = validated.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new ApiError(400, "invalid Todo data format", errorDetails);
  }
  const { title, description, dueDate, priority, status } = validated.data;
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized Access");
  }
   if (dueDate && new Date(dueDate) < Date.now()) {
    throw new ApiError(400, "Due date must be in the future");
  }

  const todo = await Todo.create({
    user: userId,
    title: title.trim(),
    description: description.trim(),
    dueDate,
    priority,
    status,
  });
  if (!todo) {
    throw new ApiError(500, "Todo could not be created");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, todo, "Todo created Successfully"));
});

const getTodo = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { todoId } = req.params;
  if (!userId) {
    throw new ApiError(401, "Unauthorized Access");
  }
  if (!mongoose.Types.ObjectId.isValid(todoId)) {
    throw new ApiError(400, "Invalid Todo Id ");
  }
  const todo = await Todo.findOne({
    _id: todoId,
    user: userId,
  }).lean();
  if (!todo) {
    throw new ApiError(404, "Todo not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, todo, "Todo Fetched successfully"));
});

const getAllTodo = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized Access");
  }

  const userId = req.user._id;
  const filter = { user: userId };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
  const limit = Number.isNaN(parseInt(req.query.limit)) ? 10 : parseInt(req.query.limit);
  const skip = (page - 1) * limit;

  const todos = await Todo.find(filter)
    .sort({ dueDate: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (todos.length === 0) {
    throw new ApiError(404, "No todos found");
  }

  const totalTodos = await Todo.countDocuments(filter);
  const totalPages = Math.ceil(totalTodos / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        todos,
        pagination: {
          totalTodos,
          totalPages,
          currentPage: page,
        },
      },
      "All todos fetched successfully"
    )
  );
});
    
const updateTodo = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized Access");
  }

  const userId = req.user._id;
  const { todoId } = req.params;

  if (!todoId) {
    throw new ApiError(400, "Missing Todo ID in request");
  }

  if (!mongoose.Types.ObjectId.isValid(todoId)) {
    throw new ApiError(400, "Invalid Todo Id");
  }

  const validatedData=todoUpdateSchema.safeParse(req.body);
  if(!validatedData.success){
      const errorDetails=validatedData.error.issues.map((issue)=>({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw new ApiError(400,"Invalid Todo data format",errorDetails)
  }
   const { title, description, dueDate, priority, status } = validatedData.data;

    if (dueDate && new Date(dueDate) < Date.now()) {
    throw new ApiError(400, "Due date must be in the future");
   }
   const updatedData = {
  ...(title && { title: title.trim() }),
  ...(description && { description: description.trim() }),
  ...(dueDate && { dueDate }),
  ...(priority && { priority }),
  ...(status && { status }),
};

const updatedTodo = await Todo.findOneAndUpdate(
  { _id: todoId, user: userId },
  updatedData,
  { new: true }
);

   console.log("hi0",updatedTodo);
   
   if (!updatedTodo) {
    throw new ApiError(500, "Todo could not be updated");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, updatedTodo, "Todo updated Successfully"));
});
const deleteTodo = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized Access");
  }

  const userId = req.user._id;
  const { todoId } = req.params;

  if (!todoId) {
    throw new ApiError(400, "Missing Todo ID in request");
  }

  if (!mongoose.Types.ObjectId.isValid(todoId)) {
    throw new ApiError(400, "Invalid Todo Id");
  }

  const deletedTodo = await Todo.findOneAndDelete({
    _id: todoId,
    user: userId,
  });

  if (!deletedTodo) {
    throw new ApiError(404, "Todo not found or not authorized to delete");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTodo, "Todo Deleted Successfully"));
});

export { createTodo, getAllTodo, getTodo, updateTodo, deleteTodo };
