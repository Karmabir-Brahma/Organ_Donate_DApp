import { useState, useEffect } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { createEthereumContract } from "../Utils/Constants";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";

function BrainDeathDonor() {

    const [donorName, setDonorName] = useState("");
    const [file, setFile] = useState("");
    const [medFile, setMedFile] = useState("");
    const [noc, setNoc] = useState("");
    const [bsdc, setbsdc] = useState("");
    const [donorAddress, setDonorAddress] = useState("");
    const [donorPhnNumber, setDonorPhnNumber] = useState("");
    const [donorRelation, setRelationship] = useState("");
    const [uniqueId, setUniqueId] = useState();
    const [address, setAddress] = useState();
    const [userPubK, setUserPubK] = useState();
    const [userSecK, setUserSecK] = useState();
    const [nonce, setNonce] = useState();
    const [authPubK, setAuthPubK] = useState();
    const navigate = useNavigate();
    const organList = ['Heart', 'Lung', 'Liver', 'Kidney', 'Pancreas', 'Intestine', 'Skin', 'Cornea'];
    const [selectedOrgan, setSelectedOrgan] = useState('');
    useEffect(() => {
        async function getUserData(signerAddress) {
            const transactionsContract = await createEthereumContract();
            try {
                // setAddress
                const data = await transactionsContract.get_DonorAcc(signerAddress);
                console.log("DATA", data);
                setAddress(signerAddress);
                if (data[0]) {
                    try {
                        const response = await axios.post("http://localhost:8000/getUserKeys",
                            { signerAddress });
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
                console.log("Error", error);
            }
        }

        const userCheck = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const signerAddress = await signer.getAddress();
            const transactionsContract = await createEthereumContract();
            const data = await transactionsContract.get_DonorAcc(signerAddress);
            console.log("data", data);
            if (data[0]) {
                getUserData(signerAddress);
            }
            else {
                console.log("No data was found");
                navigate("/Create");
            }
        }
        userCheck();
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

        //Process donor's noc
        const nocBuffer = await processFile(noc);

        //Process donor's bsdc
        const bsdcBuffer = await processFile(bsdc);

        const type = "Brain Death Donor";
        const uniqueId = Math.floor(Math.random() * Date.now()).toString(36);
        setUniqueId(uniqueId);
        const formDataObj = {
            type,
            donorName,
            donorRelation,
            donorAddress,
            donorPhnNumber,
            selectedOrgan,
            uniqueId,
            address
        };

        const formDataString = JSON.stringify(formDataObj);

        const sodium = await SodiumPlus.auto();
        const cipherText = await sodium.crypto_box(formDataString, nonce, userSecK, authPubK);

        // Encrypt donor's id proof
        const cipherText2 = await sodium.crypto_box(fileBuffer, nonce, userSecK, authPubK);
        // Encrypt donor's medical records
        const cipherText3 = await sodium.crypto_box(medFileBuffer, nonce, userSecK, authPubK);
        //Encrypt donor's noc
        const cipherText4 = await sodium.crypto_box(nocBuffer, nonce, userSecK, authPubK);
        //Encrypt donor's
        const cipherText5 = await sodium.crypto_box(bsdcBuffer, nonce, userSecK, authPubK);
        try {
            const res = await axios.post("http://localhost:8000/uploadData", {
                cipherText,
                cipherText2,
                cipherText3,
                cipherText4,
                cipherText5,
                publicKey: userPubK.buffer,
                nonce,
            });

            if (res.data !== 500) {
                console.log("Resp", res.data);
                setDonorName(" ");
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
                    <label className="form-label">Address</label>
                    <input
                        type="text"
                        className="form-control"
                        required
                        onChange={(e) => setDonorAddress(e.target.value)}
                    />
                    <br />
                    <label className="form-label">Relationship with Donor</label>
                    <input
                        type="text"
                        className="form-control"
                        required
                        onChange={(e) => setRelationship(e.target.value)}
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
                    <label className="form-label">Donor's id proof *</label>
                    <input
                        type="file"
                        className="form-control"
                        accept="application/pdf"
                        required
                        onChange={(e) => setFile(e.target.files[0])}
                    />
                    <br />
                    <label className="form-label">Donor's Medical Records *</label>
                    <input
                        type="file"
                        className="form-control"
                        accept="application/pdf"
                        required
                        onChange={(e) => setMedFile(e.target.files[0])}
                    />
                    <br />
                    <label className="form-label">NOC *</label>
                    <input
                        type="file"
                        className="form-control"
                        accept="application/pdf"
                        required
                        onChange={(e) => setNoc(e.target.files[0])}
                    />
                    <br />
                    <label className="form-label">Brain Stem Death Certificate *</label>
                    <input
                        type="file"
                        className="form-control"
                        accept="application/pdf"
                        required
                        onChange={(e) => setbsdc(e.target.files[0])}
                    />
                    <br />
                    {/* <label className="form-label">Choose an organ to donate</label> */}
                    <label className="form-label">Choosen an organ to donate</label>
                    <br />
                    <select value={selectedOrgan} required onChange={(e) => setSelectedOrgan(e.target.value)}>
                        <option value="" disabled hidden>Select an organ</option>
                        {organList.map((organ, index) => (
                            <option key={index} value={organ}>{organ}</option>
                        ))}
                    </select>
                    <br />
                    <br />
                    <button className="btn btn-primary" type="submit">
                        Submit
                    </button>
                </form>
            </div>
        </>
    );
}

export default BrainDeathDonor;