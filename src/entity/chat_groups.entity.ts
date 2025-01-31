import { ObjectId } from "mongodb"
import { USER_ROLE, USER_STATUS } from "../services/constant"
import { Entity, Column, ObjectIdColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, OneToOne } from "typeorm"
import { Chat } from "./chats.entity"
import { User } from "./users.entity"

@Entity()
export class ChatGroups {

    @ObjectIdColumn()
    _id: ObjectId

    @Column()
    name: string

    @Column()
    avatar: string

    @Column({ nullable: false })
    participents: ObjectId[]

    @Column()
    last_msg_id: ObjectId

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @DeleteDateColumn()
    deleted_at?: Date

    @OneToMany(() => Chat, (chat) => chat.chat_group_id)
    chat_id: Chat[]
}
