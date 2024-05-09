import mongoose from "mongoose";

const userEncKeys = new mongoose.Schema({
    address: String,
    publicKey: Buffer,
    privateKey: Buffer,
    nonce: Buffer
});

export default mongoose.model("userKeys", userEncKeys);