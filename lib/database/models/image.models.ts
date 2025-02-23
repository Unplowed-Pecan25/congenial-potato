import { model, models ,Schema } from "mongoose";

import { ObjectId } from 'mongoose'; // Assuming you're using Mongoose for ObjectId type

export interface IImage extends Document {
    title: string; // Required
    transformationType: string; // Required
    publicId: URL; // Required
    secureUrl: URL; // Required
    width?: number; // Optional
    height?: number; // Optional
    config?: Record<string, any>; // Optional, can be an object with any structure
    transformationUrl?: string; // Optional
    aspectRatio?: string; // Optional
    color?: string; // Optional
    prompt?: string; // Optional
    author: {
        _id: string;
        firstname: string;
        lastname: string;
    }; 
                            
    createdAt?: Date; // Optional, defaults to Date.now
    updatedAt?: Date; // Optional, defaults to Date.now
}


const ImageSchema = new Schema({
    title: { type: String, required: true},
    transformationType: { type: String, required: true },
    publicId: { type: URL, required: true },
    secureUrl: { type: URL, required: true },
    width: { type: Number },
    height: { type: Number },
    config: { type: Object },
    transformationUrl: { type: URL },
    aspectRatio: { type: String },
    color: { type: String },
    prompt: { type: String },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Image = models?.Image || model('Image', ImageSchema);

export default Image;