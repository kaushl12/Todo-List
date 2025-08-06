import {Router} from 'express'
import { createTodo, deleteTodo, getAllTodo, getTodo, updateTodo } from '../controllers/todo.controller.js';

const router=Router();

router.route("/create").post(createTodo)
router.route("/getTodo").post(getTodo)
router.route("/getAllTodo").post(getAllTodo)
router.route("/update").post(updateTodo)
router.route("/delete").post(deleteTodo)

export default router;