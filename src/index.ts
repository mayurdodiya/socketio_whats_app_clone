import "dotenv/config";
import { AppDataSource } from "./config/db_config";
import express = require("express");
import path = require("path");
import fs from "fs";
import { UserNewController } from "./services/findUserForSocket";
const userNewController = new UserNewController();

import { UserController } from "./controllers/users/users.controller";
const userController = new UserController();

import bodyParser = require("body-parser");
const PORT = process.env.PORT;

const app = express();
app.use(bodyParser.json());

const http = require("http");
const server = http.createServer(app);
import { Server } from "socket.io";
const io = new Server(server);

const users = new Map();

io.on("connection", async (socket) => {
  console.log(`User is connected with ${socket.id}`);

  // add new chat room ( group )
  socket.on("create_chat_group", async ({ groupName, newMember, htmlUserId }) => {
    const addNewChatRoom = await userNewController.addNewChatGroupForMultipleUser({ groupName, newMember, htmlUserId });
    if (addNewChatRoom.statusCode == 500) {
      socket.emit("error", { message: addNewChatRoom.message });
    } else if (addNewChatRoom.statusCode == 502) {
      socket.emit("error", { message: addNewChatRoom.message });
    } else {
      socket.emit("create_chat_group", addNewChatRoom);
    }
  });

  // add new chat room ( single )
  socket.on("add_chat_group", async ({ userNumber, htmlUserId }) => {
    console.log(userNumber, "------------------- userNumber");
    const addRoom = await userNewController.addNewChatRoom({ userNumber, htmlUserId });
    if (!addRoom) {
      socket.emit("error", { message: "User phone number not found in whatsapp!" });
    }
    console.log(addRoom, "------------- addRoom");

    // socket.emit("add_chat_group", { addRoom });
  });

  //set user is online
  async function userOnline({ userId }) {
    // set use is online
    await userNewController.userOnline({ userId: userId, socketId: socket.id });

    // change status of all chat msg as deliver when online
    await userNewController.changeChatStatusAsDeliver({ userId });
  }

  // find user id from db
  socket.on("get_user_id", async ({ token }) => {
    const userId = await userNewController.getUser(token);
    console.log(userId, "userId --------- server");
    socket.emit("get_user_id", { userId });
  });

  // find all chatlist of userId
  socket.on("chatList", async ({ userId }) => {
    // for set user status online
    await userOnline({ userId });

    const chatListDataFromDb = await userNewController.chatListing(userId);
    console.log(chatListDataFromDb, "-------------------- user chat list");
    socket.emit("chatList", { chatList: chatListDataFromDb });
  });

  // find chathistory by chatgroupId
  socket.on("chatHistory", async ({ groupId, userId, chatId }) => {
    console.log(chatId, userId, "------------userId and chatGroupId get in server");
    let chatHistory = (await userNewController.chatHistory({ userId, chatId })) as { chat_data: any[] };

    // await fs.writeFileSync('x.json', JSON.stringify(chatHistory));
    // console.log(chatHistory, '-------------------- chatHistory');
    socket.join(groupId); // join current socket in room(given group name or id)
    console.log(groupId, "<--------------------- you are join in this group Id");
    console.log(chatHistory, "<--------------------- chatHistory");
    if (!chatHistory) {
      chatHistory = { _id: groupId } as any;
    }
    socket.emit("chatHistory", { chatHistory });
  });

  // leave socket for old chat group
  socket.on("leave_group", async (oldGroupId) => {
    socket.leave(oldGroupId); // leave current socket in room(given group name or id)
    console.log(oldGroupId, "<--------------------- you are leave from this group Id");
  });

  //
  // ---------------------------
  socket.on("send_message", async ({ groupId, htmlUserId, receiverId, message }) => {
    console.log(groupId, htmlUserId, receiverId, message, "--------------------------- groupId, htmlUserId, receiverId, message");

    const currentGroupUserSocketId = io.sockets.adapter.rooms.get(groupId); // all users from room

    const addChatMsg = await userNewController.addChatMsgNEW({ groupId, sender_id: htmlUserId, receiver_id: receiverId, message, currentGroupUserSocketId });
    const user = (await userNewController.getUserDetail(htmlUserId)) as User;
    console.log(addChatMsg, "---------------------------- addChatMsg");

    // console.log(addChatMsg, '-------- message added in chats');

    io.to(groupId).emit("send_message", { message, sender_id: htmlUserId, user_name: user.name, time: addChatMsg.created_at });
    // pending from here
  });
});

// testing route
app.get("/", function (req, res) {
  // res.sendFile(path.join(__dirname, 'views', 'index.new.html'))  // for one to one chat
  // res.sendFile(path.join(__dirname, 'views', 'index.html'))     // for one to one old working chat
  // res.sendFile(path.join(__dirname, 'views', 'groupchat.html'))   // for group chat
  res.sendFile(path.join(__dirname, "views", "index.newFinal.html")); // for group chat
});

// set route
import router from "./routes";
import { User } from "./entity/users.entity";
app.use("/api", router);

// test connection
AppDataSource.initialize()
  .then(async () => {
    console.log("Database is connected Successfully!");
    // app.listen(PORT, () => {
    //     console.log(`Server is running on port ${PORT}!`)
    // })

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}!`);
    });
  })
  .catch((error) => console.log(error));
