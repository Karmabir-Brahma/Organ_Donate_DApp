// import mongoose from "mongoose";

// const authEncPubKey = new mongoose.Schema({
//     publicKey: Buffer
// });

// export default mongoose.model("authPubKey", authEncPubKey);

import mongoose from "mongoose";

const userNonce = new mongoose.Schema({
    address: String,
    nonce: Buffer
});

export default mongoose.model("userPubKey", userNonce);