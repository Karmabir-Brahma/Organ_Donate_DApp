import mongoose from "mongoose";

const authEncKeys = new mongoose.Schema({
    publicKey: Buffer,
    privateKey: Buffer,
});

export default mongoose.model("authKeys", authEncKeys);