import { NextFunction, Request, Response } from "express";
import { request } from "http";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "typeorm";
import { USER_ROLE } from "./constant";

declare global {
    namespace Express {
        interface Request {
            user?: string;
        }
    }
}

interface genUserTokenType {
    role_id: number;
    userId: ObjectId;
}

export const generateUserToken = async (data: genUserTokenType) => {
    const token = jwt.sign({ role_id: data.role_id, userId: data.userId }, process.env.SECRETE_KEY, { expiresIn: '365d' }); // one minute expiry
    return token
}
export const generateTokenForOTP = async (data: string) => {
    const token = jwt.sign({ otp: data }, process.env.SECRETE_KEY, { expiresIn: 60 * 5 }); // one minute expiry
    return token
}

export const verifyToken = async (token: string) => {
    const decoded = await jwt.verify(token, process.env.SECRETE_KEY) as JwtPayload;
    return decoded
}

export const verifyUserToken = async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
        const token = req.headers['x_token'] as string;
        
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }
        const decoded = await jwt.verify(token, process.env.SECRETE_KEY) as JwtPayload;
        // if (decoded.role_id === USER_ROLE.USER || decoded.role_id === USER_ROLE.ADMIN) {
            req.user = decoded.userId
            next();
        // } else {
            // console.log(decoded);        
            // return res.status(403).json({ message: 'Forbidden: Invalid token!' });
        // }
    } catch (error) {
        console.log(error);
        throw error
    }
}

