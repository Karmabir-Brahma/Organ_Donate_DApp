import mongoose from "mongoose";

const authEncPubKey = new mongoose.Schema({
    publicKey: Buffer
});

export default mongoose.model("authPubKey", authEncPubKey);