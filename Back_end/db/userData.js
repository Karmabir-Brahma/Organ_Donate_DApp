import mongoose from "mongoose";

const userDATA = new mongoose.Schema({
    cipherText: Buffer,
    cipherText2: Buffer,
    cipherText3: Buffer,
    cipherText4: Buffer,
    publicKey: Buffer,
    nonce: Buffer,
    sentTime: Number,
});

export default mongoose.model("userData", userDATA);