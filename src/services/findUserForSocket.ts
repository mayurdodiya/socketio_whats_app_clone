import { getMongoRepository } from "typeorm";
import { User } from "./../entity/users.entity";
import { AppDataSource } from "../config/db_config";
import { verifyToken } from "./../services/jwt_auth";
import { Chat } from "../entity/chats.entity";
import { ChatGroups } from "../entity/chat_groups.entity";
import { ObjectId } from "mongodb";
import lodash from "lodash";
import fs from "fs";

export class UserNewController {
  private chatRepository = AppDataSource.getMongoRepository(Chat);
  private userRepository = AppDataSource.getMongoRepository(User);
  private chatgroupRepository = AppDataSource.getMongoRepository(ChatGroups);

  async userOnline(data: any): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { _id: new ObjectId(data.userId) } });
      if (user) {
        user.status = "online";
        user.socket_id = data.socketId;
        await this.userRepository.save(user);
      }
      console.log(data.socketId, "------------------------ userOnline api called");

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async changeChatStatusAsDeliver(data: any): Promise<boolean> {
    try {
      // this is counduct as receiver, deliver, read
      const chats = await this.chatRepository.find({
        where: { receiver_id: { $in: [new ObjectId(data.userId)] } },
      });

      await Promise.all(
        chats.map(async (chat) => {
          await this.chatRepository.updateOne({ _id: new ObjectId(chat._id) }, { $addToSet: { delivered: new ObjectId(data.userId) } } as any);
        })
      );

      console.log("------------------------ changeChatStatusAsDeliver function called");
      return true;
    } catch (error) {
      console.error("Error in changeChatStatusAsDeliver:", error);
      return false;
    }
  }

  async getUser(token: string): Promise<boolean> {
    try {
      const decode = await verifyToken(token);
      // console.log(decode, '-------------------------------- user token decode');
      return decode.userId;
      // return res.status(200).json({ success: true, message: 'User created successfully' })
    } catch (error) {
      console.log(error);
      return false;
      // return res.status(400).json({ success: false, message: error })
    }
  }

  async getUserDetail(userId: string): Promise<Object> {
    try {
      const user = await this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
      // console.log(decode, '-------------------------------- user token decode');
      return user;
      // return res.status(200).json({ success: true, message: 'User created successfully' })
    } catch (error) {
      console.log(error);
      return false;
      // return res.status(400).json({ success: false, message: error })
    }
  }

  async addChatMsg(data: any): Promise<Chat> {
    try {
      let savedChatGroup = await this.chatgroupRepository.findOne({ where: { participents: { $and: [data.sender_id, data.receiver_id] } } });
      //   if (!savedChatGroup) {
      //     const chatGroup = new ChatGroups();
      //     (chatGroup.participents = [data.sender_id, data.receiver_id]), (chatGroup.last_msg_id = null);
      //     savedChatGroup = await this.chatgroupRepository.save(chatGroup);
      //   }

      const addMsg = new Chat();
      addMsg.sender_id = new ObjectId(data.sender_id);
      // addMsg.receiver_id = new ObjectId(data.receiver_id);
      addMsg.receiver_id = savedChatGroup.participents.map((id: ObjectId) => new ObjectId(id));
      addMsg.message = data.message;
      addMsg.message_type = "text";
      addMsg.delivered = data.receiver_id;
      addMsg.chat_group_id = new ObjectId(savedChatGroup._id);

      const chatMsg = await this.chatRepository.save(addMsg);
      console.log(chatMsg._id, "------------------------------ chat id");

      savedChatGroup.last_msg_id = chatMsg._id;
      const update = await this.chatgroupRepository.save(savedChatGroup);

      console.log(update, "---------------------------------- massage added successfully!");
      return addMsg;

      // return res.status(200).json({ success: true, message: 'User created successfully' })
    } catch (error) {
      console.log(error);
    }
  }

  async addChatMsgNEW(data: any): Promise<any> {
    try {
      let savedChatGroup = await this.chatgroupRepository.findOne({ where: { _id: new ObjectId(data.groupId) } });
      if (!savedChatGroup) {
        const chatGroup = new ChatGroups();
        (chatGroup.participents = [data.sender_id, data.receiver_id]), (chatGroup.last_msg_id = null);
        savedChatGroup = await this.chatgroupRepository.save(chatGroup);
      }

      // for read message status
      const currentGroupUserSocketIdArray = Array.from(data.currentGroupUserSocketId);
      const users = await this.userRepository.find({ where: { socket_id: { $in: currentGroupUserSocketIdArray } } });
      const currentGroupUsersId = [];
      users.forEach((item) => {
        currentGroupUsersId.push(item._id);
      });

      // add new msg
      const addMsg = new Chat();
      addMsg.sender_id = new ObjectId(data.sender_id);
      addMsg.receiver_id = savedChatGroup.participents.map((id: ObjectId) => new ObjectId(id));
      addMsg.message = data.message;
      addMsg.message_type = "text";
      addMsg.delivered = [new ObjectId(data.sender_id)] as any;
      addMsg.read = currentGroupUsersId;
      addMsg.chat_group_id = new ObjectId(savedChatGroup._id);
      const chatMsg = await this.chatRepository.save(addMsg);

      savedChatGroup.last_msg_id = chatMsg._id;
      const update = await this.chatgroupRepository.save(savedChatGroup);

      // set deliver status for only online user (not in room )
      const participent = [];
      savedChatGroup.participents.map((participentData) => {
        participent.push(new ObjectId(participentData));
      });
      const onlineUsers = await this.userRepository.find({ where: { _id: { $in: participent }, status: "online" } });
      const onlineUsersId = lodash.map(onlineUsers, "_id");
      await this.chatRepository.updateOne({ _id: new ObjectId(chatMsg._id) }, { $addToSet: { delivered: { $each: onlineUsersId } } } as any);

      console.log("---------------------------------- addChatMsgNew called");
      return addMsg;
    } catch (error) {
      console.log(error);
    }
  }

  async addNewChatRoom(data: any): Promise<any> {
    try {
      const findUser = await this.userRepository.findOne({ where: { phone_no: data.userNumber } });
      if (!findUser) {
        return false;
      }

      const chatGroup = new ChatGroups();
      chatGroup.name = null;
      chatGroup.avatar = null;
      chatGroup.participents = [new ObjectId(findUser._id), new ObjectId(data.htmlUserId)];
      chatGroup.last_msg_id = null;
      const savedChatGroup = await this.chatgroupRepository.save(chatGroup);

      //   let savedChatGroup = await this.chatgroupRepository.findOne({ where: { _id: new ObjectId(data.groupId) } });
      //   if (!savedChatGroup) {
      //     const chatGroup = new ChatGroups();
      //     (chatGroup.participents = [data.sender_id, data.receiver_id]), (chatGroup.last_msg_id = null);
      //     savedChatGroup = await this.chatgroupRepository.save(chatGroup);
      //   }

      console.log("---------------------------------- addChatMsgNew called");
      return savedChatGroup;
    } catch (error) {
      console.log(error);
    }
  }

  async addNewChatGroupForMultipleUser(data: any): Promise<any> {
    try {
      const findUser = await this.userRepository.findOne({ where: { phone_no: data.newMember } });
      if (!findUser) {
        return {
          statusCode: 500,
          message: `user number not found in whatsapp!`,
        };
      }

      const findChatGroup = await this.chatgroupRepository.findOne({ where: { name: data.groupName } });
      if (!findChatGroup) {
        const chatGroup = new ChatGroups();
        chatGroup.name = data.groupName;
        chatGroup.avatar = null;
        chatGroup.participents = [new ObjectId(findUser._id), new ObjectId(data.htmlUserId)];
        chatGroup.last_msg_id = null;
        var savedChatGroup = await this.chatgroupRepository.save(chatGroup);
      } else {
        if (!findChatGroup.participents.some((id) => id.equals(new ObjectId(findUser._id)))) {
          findChatGroup.participents.push(new ObjectId(findUser._id));

          findChatGroup.avatar = null;
          // findChatGroup.participents = [new ObjectId(findUser._id), new ObjectId(data.htmlUserId)];
          findChatGroup.participents = findChatGroup.participents;
          findChatGroup.last_msg_id = null;
          var savedChatGroup = await this.chatgroupRepository.save(findChatGroup);
        } else {
          return {
            statusCode: 502,
            message: `${findUser.name} already added in that group!`,
          };
        }
      }

      return savedChatGroup;
    } catch (error) {
      console.log(error);
    }
  }

  async chatListing(id: string): Promise<any> {
    try {
      console.log("======================================== chatListing called ========================================");

      const userId = id;
      console.log(userId, "-------------------------------- userId");

      //   const chatData = await this.chatgroupRepository
      //     .aggregate([
      //       {
      //         $match: { participents: { $all: [new ObjectId(userId)] } }, // Filter chat groups where user is a participant
      //       },
      //       {
      //         $lookup: {
      //           from: "chat", // Collection to join with
      //           localField: "last_msg_id", // Field in the `chatgroups` collection
      //           foreignField: "_id", // Field in the `chats` collection
      //           as: "messageDetails", // Output field with the matched documents
      //         },
      //       },
      //       {
      //         $lookup: {
      //           from: "user", // Lookup user details from the user collection
      //           let: { participents: "$participents" },
      //           pipeline: [
      //             {
      //               $addFields: {
      //                 participentObjectIds: {
      //                   $filter: {
      //                     input: "$$participents",
      //                     as: "id",
      //                     cond: {
      //                       $and: [
      //                         { $ne: ["$$id", null] }, // Exclude null values
      //                         { $ne: ["$$id", ""] }, // Exclude empty strings
      //                         { $eq: [{ $strLenBytes: "$$id" }, 24] }, // Include only valid 24-character strings
      //                       ],
      //                     },
      //                   },
      //                 },
      //               },
      //             },
      //             {
      //               $addFields: {
      //                 participentObjectIds: {
      //                   $map: {
      //                     input: "$participentObjectIds",
      //                     as: "id",
      //                     in: { $toObjectId: "$$id" },
      //                   },
      //                 },
      //               },
      //             },
      //             {
      //               $match: {
      //                 $expr: {
      //                   $in: ["$_id", "$participentObjectIds"],
      //                 },
      //               },
      //             },
      //             {
      //               $project: {
      //                 _id: 1,
      //                 name: 1,
      //                 phone_no: 1,
      //                 profile_image: 1,
      //               },
      //             },
      //           ],
      //           as: "userDetails",
      //         },
      //       },
      //       {
      //         $project: {
      //           last_msg_id: 1,
      //           created_at: 1,
      //           updated_at: 1,
      //           "messageDetails.message": 1,
      //           "messageDetails.sender_id": 1,
      //           "messageDetails.receiver_id": 1,
      //           "messageDetails.created_at": 1,
      //           "messageDetails.updated_at": 1,
      //           // Combine group and user details into a single key `data_details`
      //           data_details: {
      //             $cond: {
      //               if: {
      //                 $and: [
      //                   { $ne: ["$name", null] }, // If name is not null
      //                   { $ne: ["$name", ""] }, // If name is not empty
      //                 ],
      //               },
      //               then: {
      //                 id: "$_id",
      //                 name: "$name",
      //                 members: "$participents",
      //                 avatar: "$avatar",
      //                 createdAt: "$created_at",
      //                 updatedAt: "$updated_at",
      //               },
      //               else: {
      //                 $cond: {
      //                   if: { $eq: [{ $size: "$participents" }, 2] }, // If there are exactly 2 participants, it's a 1-to-1 chat
      //                   then: {
      //                     $arrayElemAt: [
      //                       {
      //                         $filter: {
      //                           input: "$userDetails",
      //                           as: "user",
      //                           cond: { $ne: ["$$user._id", { $toObjectId: userId }] }, // Exclude current user
      //                         },
      //                       },
      //                       0, // Extract the first user object
      //                     ],
      //                   },
      //                   else: null, // Return null for invalid cases
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     ])
      //     .toArray();

      //---------------------- new

      const chatData = await this.chatgroupRepository
        .aggregate([
          {
            $match: { participents: { $all: [new ObjectId(userId)] } }, // Now participents are ObjectIds
          },
          {
            $lookup: {
              from: "chat",
              localField: "last_msg_id",
              foreignField: "_id",
              as: "messageDetails",
            },
          },
          {
            $lookup: {
              from: "user",
              let: { participents: "$participents" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$participents"], // Directly match ObjectId without conversion
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
            },
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
              data_details: {
                $cond: {
                  if: {
                    $and: [{ $ne: ["$name", null] }, { $ne: ["$name", ""] }],
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
                      if: { $eq: [{ $size: "$participents" }, 2] },
                      then: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$userDetails",
                              as: "user",
                              cond: { $ne: ["$$user._id", new ObjectId(userId)] }, // No need for conversion
                            },
                          },
                          0,
                        ],
                      },
                      else: null,
                    },
                  },
                },
              },
            },
          },
        ])
        .toArray();

      // unreadMsg count
      if (chatData != null) {
        for (let z = 0; z < chatData.length; z++) {
          const findMyAllMsg = (await this.chatRepository
            .aggregate([
              {
                $match: {
                  chat_group_id: new ObjectId(chatData[z]._id),
                  receiver_id: { $in: [new ObjectId(userId)] },
                  read: { $ne: new ObjectId(userId) },
                },
              },
              {
                $count: "totalMessages",
              },
            ])
            .toArray()) as unknown as { totalMessages: number }[];

          (chatData[z] as any).totalUnreadMsgCount = findMyAllMsg[0]?.totalMessages || 0;
        }
      }

      return chatData;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async chatHistory(data: any): Promise<Object> {
    try {
      const { userId, chatId } = data;

      // reload hostory
      const newChatHistory = await this.chatgroupRepository
        .aggregate([
          {
            $match: { _id: new ObjectId(chatId) },
          },
          {
            $lookup: {
              from: "chat",
              localField: "_id",
              foreignField: "chat_group_id",
              as: "chat_data",
            },
          },
          {
            $unwind: "$chat_data",
          },
          {
            $lookup: {
              from: "user",
              localField: "chat_data.sender_id",
              foreignField: "_id",
              as: "chat_data_sender_detail",
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "chat_data.receiver_id",
              foreignField: "_id",
              as: "chat_data_receiver_detail",
            },
          },
          {
            $project: {
              participents: 1,
              last_msg_id: 1,
              created_at: 1,
              updated_at: 1,
              "chat_data._id": 1,
              "chat_data.created_at": 1,
              "chat_data.sender_id": 1,
              "chat_data.receiver_id": 1,
              "chat_data.message": 1,
              "chat_data.sender_details": {
                $arrayElemAt: [
                  {
                    $map: {
                      input: "$chat_data_sender_detail",
                      as: "detail",
                      in: {
                        name: "$$detail.name",
                        phone_no: "$$detail.phone_no",
                      },
                    },
                  },
                  0,
                ],
              },
              "chat_data.receiver_details": {
                $arrayElemAt: [
                  {
                    $map: {
                      input: "$chat_data_receiver_detail",
                      as: "detail",
                      in: {
                        name: "$$detail.name",
                        phone_no: "$$detail.phone_no",
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: "$_id",
              participents: { $first: "$participents" },
              last_msg_id: { $first: "$last_msg_id" },
              created_at: { $first: "$created_at" },
              updated_at: { $first: "$updated_at" },
              chat_data: { $push: "$chat_data" },
            },
          },
        ])
        .toArray();

      // set all msg are read of current chat group
      await this.chatRepository.updateMany({ receiver_id: new ObjectId(userId), chat_group_id: new ObjectId(chatId), read: { $ne: new ObjectId(userId) } }, { $addToSet: { read: new ObjectId(userId) } } as any);

      let chatHistory = newChatHistory[0];
      return chatHistory;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getChatGroup(groupId: string): Promise<any> {
    try {
      console.log(groupId, "-------------------------------- groupId");
      const chatGroup = await this.chatgroupRepository.findOne({ where: { _id: new ObjectId(groupId) } });
      console.log(chatGroup, "-------------------------------- chatGroup");
      return chatGroup;
      // return res.status(200).json({ success: true, message: 'User created successfully' })
    } catch (error) {
      console.log(error);
      return false;
      // return res.status(400).json({ success: false, message: error })
    }
  }

  async addGroupChatMsg(data: any): Promise<boolean> {
    try {
      const addMsg = new Chat();
      addMsg.sender_id = new ObjectId(data.sender_id);
      addMsg.message = data.message;
      addMsg.message_type = "text";
      addMsg.chat_group_id = new ObjectId(data.groupId); // groupId

      const chatMsg = await this.chatRepository.save(addMsg);
      console.log(chatMsg._id, "------------------------------ chat id");

      return true;

      // return res.status(200).json({ success: true, message: 'User created successfully' })
    } catch (error) {
      console.log(error);
      return false;
      // return res.status(400).json({ success: false, message: error })
    }
  }
}
