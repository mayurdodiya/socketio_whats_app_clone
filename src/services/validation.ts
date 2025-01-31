import Joi from "joi";
import { Request, Response, NextFunction } from "express";

export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body, { abortEarly: false  });
        if (error) {
            const errorMessages = error.details.map((err) =>
                err.message.replace(/['"]/g, "") // Remove quotes from field names
            );
            res.status(400).json({ success: false, message: errorMessages });
        } else {
            next();
        }
    };
};

export const userValidation = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    phone_no: Joi.number().required(),
    age: Joi.number().required(),
}).unknown();

export const postValidation = Joi.object({
    title: Joi.string().min(3).max(30).required(),
    description: Joi.string().required(),
}).unknown();

export const loginValidation = Joi.object({
    phone_no: Joi.string().required(),
}).unknown();

export const otpValidation = Joi.object({
    otp: Joi.string().required(),
}).unknown();