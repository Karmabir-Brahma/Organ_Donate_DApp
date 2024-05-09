import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userData from "./db/userData.js"
import userKeys from "./db/userKeys.js";
import authKeys from "./db/authKeys.js";
import authPubKey from "./db/authPubKey.js";

const app = express();
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, parameterLimit: 100000, limit: "500mb" }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
dotenv.config();
const port = process.env.PORT || 7000;
const mongourl = process.env.MONGOURL;
try {
    await mongoose.connect(mongourl);
    console.log("Mongo DB successfully connected");

    app.post('/uploadUserKeys', async (req, res) => {
        const { address, publicKey, privateKey, nonce } = req.body;
        try {
            const savedKeys = await userKeys.create({
                address,
                publicKey,
                privateKey,
                nonce
            });
            res.json(savedKeys);
        } catch (error) {
            res.json(500);
        }
    });

    app.post('/getUserKeys', async (req, res) => {
        try {
            const { walletAddress } = req.body;
            const address = walletAddress;
            const keys = await userKeys.findOne({ address });
            if (keys)
                res.json(keys);
            else
                res.json(404);
        } catch (error) {
            res.json(500)
            console.log("Error", error);
        }
    });

    app.post('/uploadAuthKeys', async (req, res) => {
        const { publicKey, privateKey } = req.body;
        try {
            const savedKeys = await authKeys.create({
                publicKey,
                privateKey
            });
            res.json(savedKeys);
        } catch (error) {
            console.log("Err", error);
            res.json(500)
        }
    });

    app.get("/getAuthKeys", async (req, res) => {
        try {
            const keys = await authKeys.find({});
            if (keys[0])
                res.json(keys[0]);
            else
                res.json(404);
        } catch (error) {
            console.log("Error", error);
            res.json(500);
        }
    })

    app.post("/uploadAuthPubKey", async (req, res) => {
        const { publicKey } = req.body;
        try {
            const savedKey = await authPubKey.create({
                publicKey
            });
            res.json(savedKey);
        } catch (error) {
            res.json(500);
        }
    });

    app.get("/getAuthPubKey", async (req, res) => {
        try {
            const key = await authPubKey.find({});
            if (key[0])
                res.json(key[0]);
            else
                res.json(404);
        } catch (error) {
            res.json(500);
        }
    })

    app.post("/uploadData", async (req, res) => {
        const { cipherText, cipherText2, cipherText3, publicKey, nonce, sentTime } = req.body;
        try {
            const savedData = await userData.create({
                cipherText,
                cipherText2,
                cipherText3,
                publicKey,
                nonce,
                sentTime
            })
            res.json(savedData);
        } catch (error) {
            console.log("Upload data err", error);
            res.json(500);
        }
    })

    app.get("/getUserData", async (req, res) => {
        try {
            const userDatas = await userData.find({});
            if (userDatas[0])
                res.json(userDatas);
            else
                res.json(404);
        } catch (error) {
            console.log("Get user data err", error);
            res.json(500);
        }
    })

    app.listen(port, () => {
        console.log(`Server is running in port: ${port}`);
    });
} catch (error) {
    console.log(error);
}