import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

// Define a type for the global object to avoid using 'any'
interface NodeJSGlobal {
    mongoose?: MongooseConnection;
}

let cached: MongooseConnection = (global as NodeJSGlobal).mongoose || { conn: null, promise: null };

if (!cached) {
    cached = (global as NodeJSGlobal).mongoose = {
        conn: null,
        promise: null,
    };
}

export const connectToDatabase = async (): Promise<Mongoose> => {
    if (cached.conn) return cached.conn;

    if (!MONGODB_URL) throw new Error('Missing MONGODB_URL');

    cached.promise =
        cached.promise ||
        mongoose.connect(MONGODB_URL, {
            dbName: 'imagnify',
            bufferCommands: false,
        });

    cached.conn = await cached.promise;

    return cached.conn;
};
