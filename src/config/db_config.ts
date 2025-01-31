import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./../entity/users.entity"
import { Chat } from "../entity/chats.entity"
import { ChatGroups } from "../entity/chat_groups.entity"

export const AppDataSource = new DataSource({
    type: "mongodb",
    host: "localhost",
    url: "mongodb://localhost:27017/whatsapp_clone",
    useNewUrlParser: true,
    useUnifiedTopology: true,
    port: 27017,
    database: "whatsapp_clone",
    synchronize: true,
    logging: false,
    entities: [User, Chat, ChatGroups],
    migrations: [],
    subscribers: [],
})


// mongodb://localhost:27017/