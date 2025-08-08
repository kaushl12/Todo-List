import {Router} from 'express'
import { createTodo, deleteTodo, getAllTodo, getTodo, updateTodo } from '../controllers/todo.controller.js';
import { userAuth } from "../middlewares/auth.middleware.js";

const router=Router();
router.use(userAuth)

router.route("/create").post(createTodo)
router.route("/getTodo/:todoId").get(getTodo)
router.route("/getAllTodo").get(getAllTodo)
router.route("/update/:todoId").patch(updateTodo)
router.route("/delete/:todoId").delete(deleteTodo)

export default router;