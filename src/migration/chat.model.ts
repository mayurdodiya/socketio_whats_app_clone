import { MongoClient, ObjectId } from 'mongodb';
import { Chat } from '../entity/chats.entity';
import { AppDataSource } from '../config/db_config';


// export class chatMigrationController {

// export const convertSenderIdToObjectId = ()=> {
//     const uri = 'mongodb://localhost:27017/whatsapp_clone';
//     const client = new MongoClient(uri);

//     try {
//         await client.connect();
//         const db = client.db('whatsapp_clone'); // Replace with your database name
//         const collection = db.collection('chat'); // Replace with your collection name

//         const cursor = collection.find({});

//         while (await cursor.hasNext()) {
//             const doc = await cursor.next();

//             if (doc.receiver_id && typeof doc.receiver_id === 'string') {
//                 await collection.updateOne(
//                     { _id: doc._id }, // Match the document by _id
//                     { $set: { receiver_id: new ObjectId(doc.receiver_id) } } // Convert receiver_id to ObjectId
//                 );
//             }
//         }

//         console.log('All receiver_id fields updated to ObjectId');
//     } catch (error) {
//         console.error('Error updating receiver_id:', error);
//     } finally {
//         await client.close();
//     }
// }
export const convertObjectId = async () => {
    try {

        const chatRepository = AppDataSource.getMongoRepository(Chat);

        chatRepository.updateMany(
            { delivered: { $type: "string" } },
            [{ $set: { delivered: [{ $toObjectId: "$delivered" }] } }]
        );
        // console.log("Delivered field updated to ObjectId array for all chats!");

        
        
        // for convert receiver_id in array and objectId
        // const chats = await chatRepository.find(); // Fetch all chat documents
        // // Update each chat document
        // for (const chat of chats) {
        //     if (!Array.isArray(chat.receiver_id)) {
        //         // If receiver_id is not already an array, convert it
        //         chat.receiver_id = [chat.receiver_id];
        //         await chatRepository.save(chat); // Save the updated document
        //     }
        // }
        // console.log("Receiver_id field updated to ObjectId array for all chats!");



    } catch (error) {
        console.error('Error updating receiver_id:', error);
    }
}
// }

