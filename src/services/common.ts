import { DeepPartial, Repository } from "typeorm"
import { User } from "../entity/users.entity"
import { ObjectId } from "mongodb"


export const Methods = {
    async find<T>(model: Repository<T>, additionalFields?: Partial<T>): Promise<T[]> {
        const query = additionalFields ? additionalFields : {}
        const data = await model.find(query)
        return data
    },
    async findOne<T>(model: Repository<T>, query: object): Promise<T> {
        const data = await model.findOne(query)
        return data
    },
    async findAndCount<T>(model: Repository<T>, skip: number, limit: number, additionalFields?: Partial<T>): Promise<[T[], number]> {
        const query = additionalFields ? additionalFields : {}
        const data = await model.findAndCount({ ...query, take: limit, skip: skip })
        return data
    },
    async save<T>(model: Repository<T>, user: DeepPartial<T>): Promise<T[] | {}> {
        const data = await model.save(user)
        return data
    },
    async delete<T>(model: Repository<T>, id: string): Promise<string> {
        const result = await model.delete(new ObjectId(id))
        if (result.affected === 0) {
            throw new Error("No record found to delete");
        }
        // return "Record deleted successfully";
        return "true";
    },
    async generateOtp(): Promise<string> {
        const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
        return generateOTP;
    }
}