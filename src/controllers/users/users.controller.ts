import twilio from 'twilio';
import { DataSource, getMongoRepository, Repository } from "typeorm";
import { User } from "./../../entity/users.entity";
import { Request, Response } from "express";
import { USER_STATUS } from "../../services/constant";
import { AppDataSource } from "../../config/db_config";
import { Message } from "./../../services/message";
import { Methods } from "./../../services/common";
import { sendSms } from "./../../services/twillioSms";
import { generateTokenForOTP, generateUserToken, verifyToken } from "./../../services/jwt_auth";
import { paginatData, paginationData } from "../../services/pagination";
import { Chat } from '../../entity/chats.entity';
import { ChatGroups } from '../../entity/chat_groups.entity';
import { MongoClient, ObjectId } from 'mongodb';



export class UserController {
    // private userRepository = AppDataSource.getRepository(User);
    private userRepository = AppDataSource.getMongoRepository(User);
    private chatRepository = AppDataSource.getMongoRepository(Chat);
    private chatgroupRepository = AppDataSource.getMongoRepository(ChatGroups);

    // constructor(
    //     private userRepository: Repository<User>
    // ) { }

    async createUser(req: Request, res: Response): Promise<Response> {
        try {
            const isExist = await this.userRepository.findOne({ where: { phone_no: req.body.phone_no } })
            if (isExist) {
                return res.status(200).json({ success: true, message: Message.DATA_EXISTS('This Phone no') })
            }

            const user = new User()
            user.name = req.body.name
            user.email = req.body.email
            user.age = req.body.age
            user.is_active = USER_STATUS.ACTIVE
            user.phone_no = req.body.phone_no
            user.status = "offline";
            user.socket_id = "";
            user.profile_image = req.body.profile_image
            user.google_id = req.body.google_id
            user.facebook_id = req.body.facebook_id

            await Methods.save(this.userRepository, user)
            return res.status(200).json({ success: true, message: 'User created successfully' })
        } catch (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: error })
        }
    }

    async loginViaOTP(req: Request, res: Response): Promise<Response> {
        try {

            // const phoneNumber = '+918347337661'
            const phoneNumber = req.body.phone_no
            const user = await Methods.findOne(this.userRepository, { where: { phone_no: phoneNumber } })
            if (!user) {
                return res.status(400).json({ success: false, message: Message.NO_DATA('This phone no') })
            }

            // generate otp an its token
            const otp = await Methods.generateOtp()
            const otpToken = await generateTokenForOTP(otp)

            // save in db
            user.otp = otpToken
            await Methods.save(this.userRepository, user)

            // send otp to user
            const msgFire = await sendSms({ phoneNumber: '+918347337661', otp })
            console.log(msgFire, '--------------------------------');

            if (!msgFire) {
                return res.status(200).json({ success: false, message: 'Failed to send OTP' })
            }

            console.log('OTP sent successfully to:', phoneNumber);
            return res.status(200).send({ success: true, message: 'OTP sent successfully', });
        } catch (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: error })
        }
    }

    async verifyOTP(req: Request, res: Response): Promise<Response> {
        try {
            // const { otp, phone_no = "+918347337661" } = req.body;
            const { otp, phone_no } = req.body;
            const user = await Methods.findOne(this.userRepository, { where: { phone_no: phone_no } })
            if (!user) {
                return res.status(400).json({ success: false, message: Message.NO_DATA('This phone no') })
            }

            const decoded = await verifyToken(user.otp)
            if (otp !== decoded.otp) {
                return res.status(200).send({ success: true, message: Message.NOT_MATCH('OTP'), });
            }

            const token = await generateUserToken({ role_id: user.role_id, userId: user._id })
            return res.status(200).send({ success: true, message: Message.LOGIN_SUCCESS, token: token });
        } catch (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: 'OTP is expire please try again!' })
        }
    }

    async getAllUser(req: Request, res: Response): Promise<Response> {
        try {
            const { page, size } = req.query
            const { skip, limit } = paginationData(+page, +size)

            const getAll = await Methods.findAndCount(this.userRepository, skip, limit)
            const { totalPage, totalRecord, currentPage, data } = paginatData(getAll, +page, +size)

            const response = {
                total_record: totalRecord,
                total_page: totalPage,
                data: data,
                current_page: currentPage,
            }
            return res.status(200).json({ success: true, message: Message.GET_DATA('User'), data: response })
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    // final chat listing
    async chatListingOLD(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user;
            const chatData = await this.chatgroupRepository.aggregate([
                {
                    $match: { participents: { $all: [userId] } } // Filter chat groups where user is a participant
                },
                {
                    $lookup: {
                        from: "chat", // Collection to join with
                        localField: "last_msg_id", // Field in the `chatgroups` collection
                        foreignField: "_id", // Field in the `chats` collection
                        as: "messageDetails" // Output field with the matched documents
                    }
                },
                {
                    $lookup: {
                        from: "user", // Lookup user details from the user collection
                        let: { participents: "$participents" },
                        pipeline: [
                            {
                                $addFields: {
                                    participentObjectIds: {
                                        $map: {
                                            input: "$$participents",
                                            as: "id",
                                            in: { $toObjectId: "$$id" },
                                        },
                                    },
                                },
                            },
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$participentObjectIds"],
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    phone_no: 1,
                                    profile_image: 1,
                                },
                            },
                        ],
                        as: "userDetails",
                    }
                },
                {
                    $project: {
                        last_msg_id: 1,
                        created_at: 1,
                        updated_at: 1,
                        "messageDetails.message": 1,
                        "messageDetails.sender_id": 1,
                        "messageDetails.receiver_id": 1,
                        "messageDetails.created_at": 1,
                        "messageDetails.updated_at": 1,
                        // Combine group and user details into a single key `data_details`
                        data_details: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $ne: ["$name", null] },  // If name is not null
                                        { $ne: ["$name", ""] }     // If name is not empty
                                    ]
                                },
                                then: {
                                    id: "$_id",
                                    name: "$name",
                                    members: "$participents",
                                    avatar: "$avatar",
                                    createdAt: "$created_at",
                                    updatedAt: "$updated_at",
                                },
                                else: {
                                    $cond: {
                                        if: { $eq: [{ $size: "$participents" }, 2] }, // If there are exactly 2 participants, it's a 1-to-1 chat
                                        then: {
                                            $filter: {
                                                input: "$userDetails",
                                                as: "user",
                                                cond: { $ne: ["$$user._id", { $toObjectId: userId }] }, // Exclude current user
                                            },
                                        },
                                        else: [], // No details if it's not a 1-to-1
                                    }
                                }
                            }
                        }
                    },
                }
            ]).toArray();

            return res.status(200).json({
                success: true,
                message: "Chat data fetched successfully",
                data: chatData,
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async chatListingOLDOLD(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user;
            console.log(userId, '---------------------- us chatid');

            const chatData = await this.chatgroupRepository.aggregate([
                {
                    $match: { participents: { $all: [userId] } } // Filter chat groups where user is a participant
                },
                {
                    $lookup: {
                        from: "chat", // Collection to join with
                        localField: "last_msg_id", // Field in the `chatgroups` collection
                        foreignField: "_id", // Field in the `chats` collection
                        as: "messageDetails" // Output field with the matched documents
                    }
                },
                {
                    $lookup: {
                        from: "user", // Lookup user details from the user collection
                        let: { participents: "$participents" },
                        pipeline: [
                            {
                                $addFields: {
                                    participentObjectIds: {
                                        $map: {
                                            input: "$$participents",
                                            as: "id",
                                            in: { $toObjectId: "$$id" },
                                        },
                                    },
                                },
                            },
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$participentObjectIds"],
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    phone_no: 1,
                                    profile_image: 1,
                                },
                            },
                        ],
                        as: "userDetails",
                    }
                },
                {
                    $project: {
                        last_msg_id: 1,
                        created_at: 1,
                        updated_at: 1,
                        "messageDetails.message": 1,
                        "messageDetails.sender_id": 1,
                        "messageDetails.receiver_id": 1,
                        "messageDetails.created_at": 1,
                        "messageDetails.updated_at": 1,
                        // Combine group and user details into a single key `data_details`
                        data_details: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $ne: ["$name", null] },  // If name is not null
                                        { $ne: ["$name", ""] }     // If name is not empty
                                    ]
                                },
                                then: [
                                    {
                                        id: "$_id",
                                        name: "$name",
                                        members: "$participents",
                                        avatar: "$avatar",
                                        createdAt: "$created_at",
                                        updatedAt: "$updated_at",
                                    }
                                ],
                                else: {
                                    $cond: {
                                        if: { $eq: [{ $size: "$participents" }, 2] }, // If there are exactly 2 participants, it's a 1-to-1 chat
                                        then: {
                                            $filter: {
                                                input: "$userDetails",
                                                as: "user",
                                                cond: { $ne: ["$$user._id", { $toObjectId: userId }] }, // Exclude current user
                                            },
                                        },
                                        else: [], // No details if it's not a 1-to-1
                                    }
                                }
                            }
                        }
                    },
                }
            ]).toArray();

            return res.status(200).json({
                success: true,
                message: "Chat data fetched successfully",
                data: chatData,
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async chatListing(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user;
            console.log(userId, '---------------------- us chatid');

            const chatData = await this.chatgroupRepository.aggregate([
                {
                    $match: { participents: { $all: [userId] } } // Filter chat groups where user is a participant
                },
                {
                    $lookup: {
                        from: "chat", // Collection to join with
                        localField: "last_msg_id", // Field in the `chatgroups` collection
                        foreignField: "_id", // Field in the `chats` collection
                        as: "messageDetails" // Output field with the matched documents
                    }
                },
                {
                    $lookup: {
                        from: "user", // Lookup user details from the user collection
                        let: { participents: "$participents" },
                        pipeline: [
                            {
                                $addFields: {
                                    participentObjectIds: {
                                        $filter: {
                                            input: "$$participents",
                                            as: "id",
                                            cond: {
                                                $and: [
                                                    { $ne: ["$$id", null] }, // Exclude null values
                                                    { $ne: ["$$id", ""] },  // Exclude empty strings
                                                    { $eq: [{ $strLenBytes: "$$id" }, 24] } // Include only valid 24-character strings
                                                ]
                                            }
                                        }
                                    }
                                },
                            },
                            {
                                $addFields: {
                                    participentObjectIds: {
                                        $map: {
                                            input: "$participentObjectIds",
                                            as: "id",
                                            in: { $toObjectId: "$$id" }
                                        }
                                    }
                                },
                            },
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$participentObjectIds"]
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    phone_no: 1,
                                    profile_image: 1,
                                },
                            },
                        ],
                        as: "userDetails",
                    }
                },
                {
                    $project: {
                        last_msg_id: 1,
                        created_at: 1,
                        updated_at: 1,
                        "messageDetails.message": 1,
                        "messageDetails.sender_id": 1,
                        "messageDetails.receiver_id": 1,
                        "messageDetails.created_at": 1,
                        "messageDetails.updated_at": 1,
                        // Combine group and user details into a single key `data_details`
                        data_details: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $ne: ["$name", null] },  // If name is not null
                                        { $ne: ["$name", ""] }     // If name is not empty
                                    ]
                                },
                                then: {
                                    id: "$_id",
                                    name: "$name",
                                    members: "$participents",
                                    avatar: "$avatar",
                                    createdAt: "$created_at",
                                    updatedAt: "$updated_at",
                                },
                                else: {
                                    $cond: {
                                        if: { $eq: [{ $size: "$participents" }, 2] }, // If there are exactly 2 participants, it's a 1-to-1 chat
                                        then: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$userDetails",
                                                        as: "user",
                                                        cond: { $ne: ["$$user._id", { $toObjectId: userId }] }, // Exclude current user
                                                    },
                                                },
                                                0 // Extract the first user object
                                            ],
                                        },
                                        else: null, // Return null for invalid cases
                                    }
                                }
                            }
                        }
                    },
                }
            ]).toArray();

            return res.status(200).json({
                success: true,
                message: "Chat data fetched successfully",
                data: chatData,
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "An error occurred while fetching chat data",
                error: error.message,
            });
        }
    }

    // chat history api
    async chatHistory(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user;
            const { chatId } = req.params;
            console.log(chatId, '-------- chatId');

            const newChatHistory = await this.chatgroupRepository.aggregate([
                {
                    $match: { _id: new ObjectId(chatId) }
                },
                {
                    $lookup: {
                        from: 'chat',
                        localField: '_id',
                        foreignField: 'chat_group_id',
                        as: 'chat_data'
                    }
                },
                {
                    $unwind: '$chat_data'
                },
                {
                    $lookup: {
                        from: 'user',
                        localField: 'chat_data.sender_id',
                        foreignField: '_id',
                        as: 'chat_data_sender_detail'
                    }
                },
                {
                    $lookup: {
                        from: 'user',
                        localField: 'chat_data.receiver_id',
                        foreignField: '_id',
                        as: 'chat_data_receiver_detail'
                    }
                },
                {
                    $project: {
                        participents: 1,
                        last_msg_id: 1,
                        created_at: 1,
                        updated_at: 1,
                        'chat_data._id': 1,
                        'chat_data.sender_id': 1,
                        'chat_data.receiver_id': 1,
                        'chat_data.message': 1,
                        'chat_data.sender_details': {
                            $arrayElemAt: [
                                {
                                    $map: {
                                        input: '$chat_data_sender_detail',
                                        as: 'detail',
                                        in: {
                                            name: '$$detail.name',
                                            phone_no: '$$detail.phone_no'
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        'chat_data.receiver_details': {
                            $arrayElemAt: [
                                {
                                    $map: {
                                        input: '$chat_data_receiver_detail',
                                        as: 'detail',
                                        in: {
                                            name: '$$detail.name',
                                            phone_no: '$$detail.phone_no'
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    },
                },
                {
                    $group: {
                        _id: '$_id',
                        participents: { $first: '$participents' },
                        last_msg_id: { $first: '$last_msg_id' },
                        created_at: { $first: '$created_at' },
                        updated_at: { $first: '$updated_at' },
                        chat_data: { $push: '$chat_data' }
                    }
                }
            ]).toArray();

            // let chatHistory = newChatHistory[0]
            let chatHistory = newChatHistory
            return res.status(200).json({ success: true, message: Message.GET_DATA('User'), data: chatHistory })
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async addChatMsg(req: Request, res: Response): Promise<any> {
        try {
            const groupId = "6790737cdb92f00c36a30129"
            const sender_id = "678b42b35a4c8f2ef92ebb29"
            const receiver_id = "678b43ed647510ef5a97fca5"
            const message = "678b43ed647510ef5a97fca5"
            let savedChatGroup = await this.chatgroupRepository.findOne({ where: { _id: new ObjectId(groupId) } })
            console.log(savedChatGroup, '------------------ savedChatGroup');
            // console.log(savedChatGroup.participents.map((id: string) => new ObjectId(id)), '------------------ participents');

            // return
            if (!savedChatGroup) {
                const chatGroup = new ChatGroups()
                chatGroup.participents = [new ObjectId(sender_id), new ObjectId(receiver_id)],
                    chatGroup.last_msg_id = null
                savedChatGroup = await this.chatgroupRepository.save(chatGroup)
            }

            const addMsg = new Chat()
            addMsg.sender_id = new ObjectId(sender_id);
            // addMsg.receiver_id = new ObjectId(data.receiver_id);
            addMsg.receiver_id = savedChatGroup.participents

            addMsg.message = message;
            addMsg.message_type = 'text';
            // addMsg.delivered = receiver_id;
            addMsg.chat_group_id = new ObjectId(savedChatGroup._id)

            // const chatMsg = await this.chatRepository.save(addMsg);
            // console.log(chatMsg._id, '------------------------------ chat id');

            // savedChatGroup.last_msg_id = chatMsg._id;
            // const update = await this.chatgroupRepository.save(savedChatGroup)

            // console.log(update, '---------------------------------- massage added successfully!');
            // return addMsg;

            // return res.status(200).json({ success: true, message: 'User created successfully' })
        } catch (error) {
            console.log(error);
            // return false
            // return res.status(400).json({ success: false, message: error })
        }
    }
}

