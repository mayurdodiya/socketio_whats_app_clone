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


// socket log ==>
// {
//   _events: [Object: null prototype] { error: [Function: noop] },
//   _eventsCount: 1,
//   _maxListeners: undefined,
//   recovered: false,
//   data: {},
//   connected: true,
//   acks: Map(0) {},
//   fns: [],
//   flags: {},
//   server: <ref *3> Server {
//     _events: [Object: null prototype] {},
//     _eventsCount: 0,
//     _maxListeners: undefined,
//     _nsps: Map(1) { '/' => [Namespace] },
//     parentNsps: Map(0) {},
//     parentNamespacesFromRegExp: Map(0) {},
//     _path: '/socket.io',
//     clientPathRegex: /^\/socket\.io\/socket\.io(\.msgpack|\.esm)?(\.min)?\.js(\.map)?(?:\?|$)/,
//     _connectTimeout: 45000,
//     _serveClient: true,
//     _parser: {
//       protocol: 5,
//       PacketType: [Object],
//       Encoder: [class Encoder],
//       Decoder: [class Decoder extends Emitter]
//     },
//     encoder: Encoder { replacer: undefined },
//     opts: { cleanupEmptyChildNamespaces: false },
//     _adapter: [class Adapter extends EventEmitter],
//     sockets: <ref *2> Namespace {
//       _events: [Object: null prototype],
//       _eventsCount: 1,
//       _maxListeners: undefined,
//       sockets: [Map],
//       _preConnectSockets: Map(0) {},
//       _fns: [],
//       _ids: 0,
//       server: [Circular *3],
//       name: '/',
//       adapter: [Adapter],
//       [Symbol(shapeMode)]: false,
//       [Symbol(kCapture)]: false
//     },
//     eio: Server {
//       _events: [Object: null prototype],
//       _eventsCount: 1,
//       _maxListeners: undefined,
//       middlewares: [],
//       clients: [Object],
//       clientsCount: 1,
//       opts: [Object],
//       ws: [WebSocketServer],
//       [Symbol(shapeMode)]: false,
//       [Symbol(kCapture)]: false
//     },
//     httpServer: Server {
//       maxHeaderSize: undefined,
//       insecureHTTPParser: undefined,
//       requestTimeout: 300000,
//       headersTimeout: 60000,
//       keepAliveTimeout: 5000,
//       connectionsCheckingInterval: 30000,
//       requireHostHeader: true,
//       joinDuplicateHeaders: undefined,
//       rejectNonStandardBodyWrites: false,
//       _events: [Object: null prototype],
//       _eventsCount: 5,
//       _maxListeners: undefined,
//       _connections: 1,
//       _handle: [TCP],
//       _usingWorkers: false,
//       _workers: [],
//       _unref: false,
//       _listeningId: 1,
//       allowHalfOpen: true,
//       pauseOnConnect: false,
//       noDelay: true,
//       keepAlive: false,
//       keepAliveInitialDelay: 0,
//       highWaterMark: 16384,
//       httpAllowHalfOpen: false,
//       timeout: 0,
//       maxHeadersCount: null,
//       maxRequestsPerSocket: 0,
//       _connectionKey: '4:0.0.0.0:3000',
//       [Symbol(IncomingMessage)]: [Function: IncomingMessage],
//       [Symbol(ServerResponse)]: [Function: ServerResponse],
//       [Symbol(shapeMode)]: false,
//       [Symbol(kCapture)]: false,
//       [Symbol(async_id_symbol)]: 88,
//       [Symbol(kUniqueHeaders)]: null,
//       [Symbol(http.server.connections)]: ConnectionsList {},
//       [Symbol(http.server.connectionsCheckingInterval)]: Timeout {
//         _idleTimeout: 30000,
//         _idlePrev: [TimersList],
//         _idleNext: [TimersList],
//         _idleStart: 967,
//         _onTimeout: [Function: bound checkConnections],
//         _timerArgs: undefined,
//         _repeat: 30000,
//         _destroyed: false,
//         [Symbol(refed)]: false,
//         [Symbol(kHasPrimitive)]: false,
//         [Symbol(asyncId)]: 90,
//         [Symbol(triggerId)]: 89
//       }
//     },
//     engine: Server {
//       _events: [Object: null prototype],
//       _eventsCount: 1,
//       _maxListeners: undefined,
//       middlewares: [],
//       clients: [Object],
//       clientsCount: 1,
//       opts: [Object],
//       ws: [WebSocketServer],
//       [Symbol(shapeMode)]: false,
//       [Symbol(kCapture)]: false
//     },
//     [Symbol(shapeMode)]: false,
//     [Symbol(kCapture)]: false
//   },
//   adapter: <ref *4> Adapter {
//     _events: [Object: null prototype] {},
//     _eventsCount: 0,
//     _maxListeners: undefined,
//     nsp: <ref *2> Namespace {
//       _events: [Object: null prototype],
//       _eventsCount: 1,
//       _maxListeners: undefined,
//       sockets: [Map],
//       _preConnectSockets: Map(0) {},
//       _fns: [],
//       _ids: 0,
//       server: [Server],
//       name: '/',
//       adapter: [Circular *4],
//       [Symbol(shapeMode)]: false,
//       [Symbol(kCapture)]: false
//     },
//     rooms: Map(1) { 'pW_0tyhkmWS6XkBOAAAB' => [Set] },
//     sids: Map(1) { 'pW_0tyhkmWS6XkBOAAAB' => [Set] },
//     encoder: Encoder { replacer: undefined },
//     [Symbol(shapeMode)]: false,
//     [Symbol(kCapture)]: false
//   },
//   id: 'pW_0tyhkmWS6XkBOAAAB',
//   handshake: {
//     headers: {
//       host: 'localhost:3000',
//       connection: 'keep-alive',
//       'sec-ch-ua-platform': '"Windows"',
//       'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',    
//       accept: '*/*',
//       'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-fetch-site': 'same-origin',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-dest': 'empty',
//       referer: 'http://localhost:3000/index.html',
//       'accept-encoding': 'gzip, deflate, br, zstd',
//       'accept-language': 'en-US,en;q=0.9'
//     },
//     time: 'Sat Aug 30 2025 17:14:32 GMT+0530 (India Standard Time)',
//     address: '127.0.0.1',
//     xdomain: false,
//     secure: false,
//     issued: 1756554272448,
//     url: '/socket.io/?EIO=4&transport=polling&t=726aqu0u',
//     query: [Object: null prototype] {
//       EIO: '4',
//       transport: 'polling',
//       t: '726aqu0u'
//     },
//     auth: {}
//   },
//   [Symbol(shapeMode)]: false,
//   [Symbol(kCapture)]: false
// }

