import { ObjectId } from "mongodb"
import { Entity, Column, ObjectIdColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm"

@Entity()
export class Like {

    @ObjectIdColumn()
    _id: ObjectId

    @Column({ nullable: false, })
    user_id: string

    @Column({ nullable: false, })
    post_id: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @DeleteDateColumn()
    deleted_at?: Date

}
