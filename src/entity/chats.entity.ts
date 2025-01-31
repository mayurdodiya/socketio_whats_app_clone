import { ObjectId } from "mongodb"
import { USER_ROLE, USER_STATUS } from "../services/constant"
import { Entity, Column, ObjectIdColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne } from "typeorm"
import { ChatGroups } from "./chat_groups.entity"

@Entity()
export class Chat {

    @ObjectIdColumn()
    _id: ObjectId

    @Column()
    sender_id: ObjectId

    @Column("simple-array", { default: [] })
    receiver_id: ObjectId[]

    @Column({ nullable: false, })
    message: string

    @Column({ nullable: false, default: "text" })
    message_type: string

    @Column("simple-array", { default: [] })
    delivered: ObjectId[];

    @Column("simple-array", { default: [] })
    read: ObjectId[];

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @DeleteDateColumn()
    deleted_at?: Date

    // @ManyToOne(() => ChatGroups, (chat_group) => chat_group.chat_id)
    // chat_group_id: ChatGroups

    chat_group_id: ObjectId

}
