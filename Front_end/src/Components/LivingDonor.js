import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { createEthereumContract } from "../Utils/Constants";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";

function LivingDonor() {

    const [donorName, setDonorName] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [file, setFile] = useState("");
    const [medFile, setMedFile] = useState("");
    const [donorAddress, setDonorAddress] = useState("");
    const [donorPhnNumber, setDonorPhnNumber] = useState("");
    const [name, setName] = useState("");
    const [uniqueId, setUniqueId] = useState();
    const [userPubK, setUserPubK] = useState();
    const [userSecK, setUserSecK] = useState();
    const [nonce, setNonce] = useState();
    const [authPubK, setAuthPubK] = useState();
    const navigate = useNavigate();
    useEffect(() => {
        async function getUserData() {
            const transactionsContract = await createEthereumContract();
            const walletAddress = localStorage.getItem("address");
            try {
                // setAddress
                const data = await transactionsContract.getCid_DonorAcc(walletAddress);
                if (data) {
                    try {
                        // const response = await fetch(`https://${data}.ipfs.dweb.link/info.json`);
                        const response = await fetch(`https://bkrgateway.infura-ipfs.io/ipfs/${data}`);
                        const res = await response.json();
                        setName(res.name);
                    } catch (error) {
                        console.log(error);
                    }
                    try {
                        const response = await axios.post("http://localhost:8000/getUserKeys",
                            { walletAddress });
                        if (response.data !== 404) {
                            response.data.nonce = Buffer.from(response.data.nonce);
                            const bufferP = Buffer.from(response.data.publicKey);
                            const bufferS = Buffer.from(response.data.privateKey);

                            const pubK = new X25519PublicKey(bufferP);
                            const secK = new X25519SecretKey(bufferS);
                            setUserPubK(pubK);
                            setUserSecK(secK);
                            setNonce(response.data.nonce);
                        }
                        else if (response.data === 404) {
                            console.log("No keys found");
                            // setGenerateKeys(true);
                        }
                        else
                            console.log("Internal Server Error");
                    } catch (error) {
                        console.log("Error", error.message);
                    }

                    try {
                        const res = await axios.get("http://localhost:8000/getAuthPubKey");
                        if (res.data !== 404) {
                            const bufferP = Buffer.from(res.data.publicKey);
                            const pubK = new X25519PublicKey(bufferP);
                            setAuthPubK(pubK);
                        }
                        else
                            console.log("No Auth Public Key");
                    } catch (error) {
                        console.log("Error", error.message);
                    }
                }
                else {
                    console.log("No data was found");
                    navigate("/Create");
                }
            } catch (error) {
                console.log("Error");
            }
        }
        getUserData();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();

        const processFile = async (inputFile) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const arrayBuffer = e.target.result;
                    const buffer = Buffer.from(arrayBuffer);
                    resolve(buffer);
                };

                reader.onerror = (error) => {
                    reject(error);
                };

                reader.readAsArrayBuffer(inputFile);
            });
        };

        // Process donor's id proof file
        const fileBuffer = await processFile(file);

        // Process donor's medical records file
        const medFileBuffer = await processFile(medFile);

        const type = "Living Donor";
        const uniqueId = Math.floor(Math.random() * Date.now()).toString(36);
        setUniqueId(uniqueId);
        const formDataObj = {
            type,
            donorName,
            recipientName,
            donorAddress,
            donorPhnNumber,
            uniqueId
        };

        const formDataString = JSON.stringify(formDataObj);

        const sodium = await SodiumPlus.auto();
        const cipherText = await sodium.crypto_box(formDataString, nonce, userSecK, authPubK);

        // Encrypt donor's id proof
        const cipherText2 = await sodium.crypto_box(fileBuffer, nonce, userSecK, authPubK);
        // Encrypt donor's medical records
        const cipherText3 = await sodium.crypto_box(medFileBuffer, nonce, userSecK, authPubK);
        try {
            const res = await axios.post("http://localhost:8000/uploadData", {
                cipherText,
                cipherText2,
                cipherText3,
                publicKey: userPubK.buffer,
                nonce,
            });

            if (res.data !== 500) {
                console.log("Resp", res.data);
                setDonorName(" ");
                setRecipientName(" ");
                setDonorAddress(" ");
                setDonorPhnNumber(" ");
                setFile(" ");
                setMedFile(" ");
            } else {
                console.log("Internal Server Error");
            }
        } catch (error) {
            console.log("Error", error.message);
        }
    }
    return (
        <>
            <div className="user_box">
                <h2><strong>Fill the registration form</strong></h2>
            </div>
            <div className="App">
                <form className="formStyle" onSubmit={handleSubmit}>
                    <h4 style={{ textAlign: 'center' }}>Fill the form</h4>
                    <br />
                    <label className="form-label">Donor Name*:</label>
                    <input
                        type="text"
                        className="form-control"
                        required
                        onChange={(e) => setDonorName(e.target.value)}
                    />
                    <br />
                    <label className="form-label">Recipient Name*:</label>
                    <input
                        type="text"
                        className="form-control"
                        required
                        onChange={(e) => setRecipientName(e.target.value)}
                    />
                    <br />
                    <label className="form-label">Address</label>
                    <input
                        type="text"
                        className="form-control"
                        required
                        onChange={(e) => setDonorAddress(e.target.value)}
                    />
                    <br />
                    <label className="form-label">Tel Number</label>
                    <input
                        type="tel"
                        maxLength="10"
                        className="form-control"
                        required
                        onChange={(e) => setDonorPhnNumber(e.target.value)}
                    />
                    <br />
                    <label className="form-label">Donor's id proof*</label>
                    <input
                        type="file"
                        className="form-control"
                        accept="application/pdf"
                        required
                        onChange={(e) => setFile(e.target.files[0])}
                    />
                    <br />
                    <label className="form-label">Donor's Medical Records</label>
                    <input
                        type="file"
                        className="form-control"
                        accept="application/pdf"
                        required
                        onChange={(e) => setMedFile(e.target.files[0])}
                    />
                    <br />
                    <button className="btn btn-primary" type="submit">
                        Submit
                    </button>
                </form>
            </div>
        </>
    );
}

export default LivingDonor;