import { ObjectId } from "mongodb"
import { USER_ROLE, USER_STATUS } from "./../services/constant"
import { Entity, Column, ObjectIdColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToOne } from "typeorm"
import { ChatGroups } from "./chat_groups.entity"

@Entity()
export class User {

    @ObjectIdColumn()
    _id: ObjectId

    @Column({ default: USER_ROLE.USER })
    role_id: USER_ROLE

    @Column({ nullable: false, })
    name: string

    @Column({ nullable: false, })
    email: string

    @Column({ nullable: false, })
    phone_no: string

    @Column()
    age: number

    @Column({ type: "enum", enum: USER_STATUS, nullable: false, default: USER_STATUS.INACTIVE })
    is_active: USER_STATUS

    @Column()
    profile_image: string

    @Column({ default: "offline" })
    status: string

    @Column({ default: null })
    socket_id: string

    @Column()
    google_id: string

    @Column()
    facebook_id: string

    @Column({ default: null })
    otp: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @DeleteDateColumn()
    deleted_at?: Date
}
