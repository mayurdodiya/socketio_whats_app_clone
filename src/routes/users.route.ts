import * as express from "express";
const userRoute = express.Router();
import { loginValidation, otpValidation, postValidation, userValidation, validate } from "./../services/validation";
import { verifyUserToken } from "../services/jwt_auth";
import { UserController } from "./../controllers/users/users.controller";
const userController = new UserController()


userRoute.post("/add", validate(userValidation), userController.createUser.bind(userController));
userRoute.post("/send-otp", validate(loginValidation), userController.loginViaOTP.bind(userController));
userRoute.post("/verify-otp", validate(otpValidation), userController.verifyOTP.bind(userController));
userRoute.get("/getall", userController.getAllUser.bind(userController));
userRoute.get("/chatlist", verifyUserToken, userController.chatListing.bind(userController));
userRoute.get("/chathistory/:chatId", verifyUserToken, userController.chatHistory.bind(userController));
userRoute.get("/addChatMsg", verifyUserToken, userController.addChatMsg.bind(userController));

export { userRoute };
