import { ObjectId } from "mongodb"
import { Entity, Column, ObjectIdColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, BeforeInsert } from "typeorm"

@Entity()
export class Post {

    @ObjectIdColumn()
    _id: ObjectId

    @Column({ nullable: false, })
    title: string

    @Column({ nullable: false, })
    description: string

    @Column()
    image_url: string

    @Column({ default: 0, nullable: false })
    total_like: number

    @Column({ default: 0, nullable: false })
    total_comment: number

    @BeforeInsert()
    setDefaults() {
        if (this.total_like === undefined) {
            this.total_like = 0;
        }
        if (this.total_comment === undefined) {
            this.total_comment = 0;
        }
    }

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @DeleteDateColumn()
    deleted_at?: Date

}
