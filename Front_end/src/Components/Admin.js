import { useState, useEffect } from "react";
import { createEthereumContract, contractAddress } from "../Utils/Constants";
import CreateSession from "../Helper/CreateSession";
import { useNavigate } from "react-router-dom";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";
import { ethers } from "ethers";
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';
import axios from "axios";
import { createEthereumContractVote, contractAddress2 } from "../Utils/Constants2";
import { createSmartAccountClient, PaymasterMode, DEFAULT_SESSION_KEY_MANAGER_MODULE, createSessionKeyManagerModule } from "@biconomy/account";

const projectId = '2PKl9646Eki8bAgSFg97ZsbvbiA';
const projectSecret = 'eeea96e39915097c927f22f19aad633c';
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
const client = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    apiPath: '/api/v0',
    headers: {
        authorization: auth,
    }
});

const abiSVMAddress = "0x7818f8713Dac316908d6cd57702F5204B187fEaf"

function Admin() {
    const [admin, setAdmin] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [authKeys, setAuthKeys] = useState(false);
    const [showKeys, setShowKeys] = useState(false);
    const [authPubK, setAuthPubK] = useState("");
    const [authSecK, setAuthSecK] = useState("");
    const [userDatas, setUserDatas] = useState([]);
    const [nonce, setNonce] = useState("");
    let [smartWallet2, setSmartWallet2] = useState("");
    const [provider, setProvider] = useState("");
    const [address, setDonorAddress] = useState("");
    const [smartWalletAddress2, setSmartWalletAddress2] = useState("");
    const [decryptedPubK, setDecryptedPubK] = useState("");
    const [decryptedSecK, setDecryptedSecK] = useState("");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authWalletAddress, setAuthWalletAddress] = useState("");
    const [position, setPosition] = useState("");
    const [idProofBuff, setIdProofBuff] = useState("");
    const [medProofBuff, setMedProofBuff] = useState("");
    const [nocProofBuff, setNocProofBuff] = useState("");
    const [idProofBlob, setIdProofBlob] = useState("");
    const [medProofBlob, setMedProofBlob] = useState("");
    const [nocProffBlob, setNocProofBlob] = useState("");

    const navigate = useNavigate();
    useEffect(() => {
        const setUp = async () => {
            try {
                //getting provider and signer
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                setProvider(provider);
                const signer = provider.getSigner();
                console.log("Signer", signer);
                //creating smart wallet
                let smartAccount = await createSmartAccountClient({
                    signer,
                    biconomyPaymasterApiKey: process.env.REACT_APP_BICONOMYPAYMASTERAPIKEY,
                    bundlerUrl: process.env.REACT_APP_BUNDLERURL,
                });
                setSmartWallet2(smartAccount);
                const smartWalletAddress = await smartAccount.getAccountAddress();
                setSmartWalletAddress2(smartWalletAddress);
                console.log("Smart Account Address:-", smartWalletAddress);
                console.log("Smart Account", smartAccount);

                //fetching the Donor Data
                const response = await axios.get("http://localhost:8000/getAuthKeys");
                console.log("RESP", response.data);
                if (response.data === 404)
                    setAuthKeys(true)
                else if (response.data !== 404) {
                    const bufferP = Buffer.from(response.data.publicKey);
                    const bufferS = Buffer.from(response.data.privateKey);

                    const pubK = new X25519PublicKey(bufferP);
                    const secK = new X25519SecretKey(bufferS);
                    setAuthPubK(pubK);
                    setAuthSecK(secK);

                    const res = await axios.get("http://localhost:8000/getUserData");
                    if (res.status === 200) {
                        console.log("Fetched user datas", res.data);
                        const retrievedData = res.data;
                        const sodium = await SodiumPlus.auto();

                        const patientDatas = retrievedData.map(async (data) => {
                            console.log("Actual Data:", data);
                            console.log("Type of Data:", typeof data);
                            const nonce = Buffer.from(data.nonce);
                            const cipherText = Buffer.from(data.cipherText);
                            const cipherText2 = Buffer.from(data.cipherText2);
                            const cipherText3 = Buffer.from(data.cipherText3);
                            const cipherText4 = Buffer.from(data.cipherText4);
                            const bufferP = Buffer.from(data.publicKey);
                            const patientPubK = new X25519PublicKey(bufferP);

                            const decryptedBUff = await sodium.crypto_box_open(cipherText, nonce, secK, patientPubK);
                            const decryptedBUff2 = await sodium.crypto_box_open(cipherText2, nonce, secK, patientPubK); //id proof pdf
                            const decryptedBUff3 = await sodium.crypto_box_open(cipherText3, nonce, secK, patientPubK); //Med Record pdf
                            const decryptedBUff4 = await sodium.crypto_box_open(cipherText4, nonce, secK, patientPubK); //NOC pdf

                            const decryptedObj = JSON.parse(decryptedBUff.toString('utf-8'));
                            console.log("Decrypted Obj", decryptedObj);

                            setDonorAddress(decryptedBUff.address);
                            const pdfBlob2 = new Blob([decryptedBUff2], { type: "application/pdf" });
                            const url2 = URL.createObjectURL(pdfBlob2);
                            setIdProofBuff(decryptedBUff2);
                            setIdProofBlob(pdfBlob2);

                            const pdfBlob3 = new Blob([decryptedBUff3], { type: "application/pdf" });
                            const url3 = URL.createObjectURL(pdfBlob3);
                            setMedProofBuff(decryptedBUff3);
                            setMedProofBlob(pdfBlob3);

                            const pdfBlob4 = new Blob([decryptedBUff4], { type: "application/pdf" });
                            const url4 = URL.createObjectURL(pdfBlob4);
                            setNocProofBuff(decryptedBUff4);
                            setNocProofBlob(pdfBlob4);
                            //Count Time
                            let min = 0;
                            let sec = 0;
                            const transactionContractVote = await createEthereumContractVote();
                            const checkVoteStarted = await transactionContractVote.checkStartElection(decryptedObj.uniqueId);
                            console.log("Started");
                            if (checkVoteStarted == true) {
                                const startTime = await transactionContractVote.checkStartTime(decryptedObj.uniqueId);
                                const time = Date.now() - Number(startTime);
                                const remainingTime = 3600000 - time;
                                console.log("Remaining Time", remainingTime);

                                sec = Math.floor((remainingTime / 1000) % 60);
                                min = Math.floor((remainingTime / 1000 / 60) % 60);

                                const timeOutId = setTimeout(async () => {
                                    clearInterval(intervalId);
                                    console.log("Inside timeOut:", data);
                                    const checkVoteEnded = await transactionContractVote.checkEndElection(decryptedObj.uniqueId);
                                    let flag = false;
                                    if (!checkVoteEnded) {
                                        console.log("Inside check vote end");
                                        const sessionKeyPrivKey = window.localStorage.getItem("sessionSigner");
                                        console.log("sessionKeyPrivKey", sessionKeyPrivKey);
                                        if (!sessionKeyPrivKey) {
                                            alert("Session key not found please create session");
                                            return;
                                        }
                                        const sessionSigner = new ethers.Wallet(sessionKeyPrivKey, provider);
                                        console.log("sessionSigner", sessionSigner);

                                        // generate sessionModule
                                        const sessionModule = await createSessionKeyManagerModule({
                                            moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
                                            smartAccountAddress: smartWalletAddress2,
                                        });
                                        console.log("Session Module", sessionModule);
                                        // set active module to sessionModule
                                        console.log("Smart Wallet", smartAccount);
                                        smartAccount = await smartAccount.setActiveValidationModule(sessionModule);
                                        const endVote = await transactionContractVote.populateTransaction.endElection(decryptedObj.uniqueId);
                                        const tx = {
                                            to: contractAddress2,
                                            data: endVote.data
                                        }
                                        console.log("Jakayw", tx);
                                        const transactionArray = [];
                                        transactionArray.push(tx);
                                        try {
                                            const userOp = await smartAccount.buildUserOp(transactionArray, {
                                                params: {
                                                    sessionSigner: sessionSigner,
                                                    sessionValidationModule: abiSVMAddress,
                                                },
                                            });
                                            console.log("After jakayw");
                                            const userOpResponse = await smartAccount.sendUserOp(userOp, {
                                                sessionSigner: sessionSigner,
                                                sessionValidationModule: abiSVMAddress,
                                            });
                                            console.log("userOpHash", userOpResponse);
                                            const userOpReceipt = await userOpResponse.wait();
                                            console.log("txHash", userOpReceipt);
                                            if (userOpReceipt.success == "true") {
                                                console.log("Transaction Receipt: ", userOpReceipt.receipt);
                                                setUserDatas(prevUserDatas => {
                                                    console.log("Konga");
                                                    const updatedUserDatas = prevUserDatas.map(async (userData) => {
                                                        if (userData.uniqueId === decryptedObj.uniqueId) {
                                                            flag = true;
                                                            addToIPFS(userData, smartAccount, secK, patientPubK)
                                                            return {
                                                                ...userData,
                                                                disableButton: true,
                                                                voteEnd: true
                                                            };
                                                        }
                                                        return userData;
                                                    });
                                                    return updatedUserDatas;
                                                });
                                            }
                                        } catch (error) {
                                            console.log("Couldn't end vote", error);
                                        }
                                    }
                                    if (!flag) {
                                        setUserDatas(prevUserDatas => {
                                            console.log("Konga");
                                            const updatedUserDatas = prevUserDatas.map((userData) => {
                                                if (userData.uniqueId === decryptedObj.uniqueId) {
                                                    console.log("Donor Data", userData);
                                                    addToIPFS(userData, smartAccount, secK, patientPubK);
                                                    return {
                                                        ...userData,
                                                        disableButton: true,
                                                        voteEnd: true
                                                    };
                                                }
                                                return userData;
                                            });
                                            return updatedUserDatas;
                                        });
                                    }
                                }, remainingTime);
                                const intervalId = setInterval(() => {
                                    const time = Date.now() - Number(startTime);
                                    const remainingTime = 3600000 - time;
                                    console.log("Inside Interval");
                                    sec = Math.floor((remainingTime / 1000) % 60);
                                    min = Math.floor((remainingTime / 1000 / 60) % 60);
                                    setUserDatas(prevUserDatas => {
                                        const updatedUserDatas = prevUserDatas.map(userData => {
                                            if (userData.uniqueId === decryptedObj.uniqueId) {
                                                return {
                                                    ...userData,
                                                    minutes: min,
                                                    seconds: sec
                                                };
                                            }
                                            return userData;
                                        });
                                        return updatedUserDatas;
                                    });
                                    if (sec > 59) {
                                        min++;
                                    }
                                }, 1000);
                            }
                            // Include PDF URLs in the patient data object
                            const patientDataWithUrls = {
                                ...decryptedObj,
                                idProofUrl: url2,
                                medicalRecordUrl: url3,
                                nocUrl: url4,
                                minutes: min,
                                seconds: sec,
                                disableButton: false,
                                voteStarted: checkVoteStarted,
                                voteEnd: false,
                            };
                            console.log("Per patient", patientDataWithUrls);
                            return patientDataWithUrls;
                        });

                        const pData = await Promise.all(patientDatas);
                        console.log("DATA", pData);
                        console.log("HGJH", pData);
                        setUserDatas(pData);
                        startVote(pData, smartAccount);
                    } else if (res.status === 404) {
                        console.log("Data not found");
                    } else {
                        console.log("Internal Server Error");
                    }
                }
                else
                    console.log("Internal Server Error");
            } catch (error) {
                console.log("Error msg", error.message);
            }
        }

        const adminCheck = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const signerAddress = await signer.getAddress();
            console.log("Signer Address", signerAddress);
            const transactionContract = await createEthereumContract();
            const adminAddress = await transactionContract.checkAdmin();
            if (signerAddress.toLowerCase() === adminAddress.toLowerCase()) {
                setAdmin(true);
                setUp();
            }
            else
                navigate("/Error");
        }
        adminCheck();
    }, []);

    async function addToIPFS(userData, smartWallet2, secK, patientPubK) {
        try {
            const uniqueId = userData.uniqueId;
            const transactionContract = await createEthereumContract();
            const transactionContractVote = await createEthereumContractVote();
            const approvedVotes = await transactionContractVote.approveVotes(uniqueId);
            //Setting the sessionKeySigner
            const sessionKeyPrivKey = window.localStorage.getItem("sessionSigner");
            console.log("sessionKeyPrivKey", sessionKeyPrivKey);
            if (!sessionKeyPrivKey) {
                alert("Session key not found please create session");
                return;
            }
            const sessionSigner = new ethers.Wallet(sessionKeyPrivKey, provider);
            console.log("sessionSigner", sessionSigner);

            // generate sessionModule
            const sessionModule = await createSessionKeyManagerModule({
                moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
                smartAccountAddress: smartWalletAddress2,
            });
            console.log("Session Module", sessionModule);
            // set active module to sessionModule
            console.log("Smart Wallet", smartWallet2);
            smartWallet2 = await smartWallet2.setActiveValidationModule(sessionModule);

            const threshold = await transactionContract.minimumThreshold(approvedVotes);
            console.log("Threshold type", typeof threshold);
            //Check the minimum threshold required
            if (!threshold) {
                console.log("Inside threshold");
                const donorRegsData = {
                    donorName: userData.donorName,
                    donorAddress: userData.donorAddress,
                    donorPhnNumber: userData.donorPhnNumber,
                    donorUniqueId: userData.uniqueId,
                    idProofBuff: idProofBuff,
                    idProofBolb: idProofBlob,
                    medProofBuff: medProofBuff,
                    medProofBolb: medProofBlob,
                    recipientName: userData.recipientName,
                    recipientRelation: userData.receiptRelation,
                    typeOfDonation: userData.type,
                    approveStatus: "success"
                }
                const donorRegsDataString = JSON.stringify(donorRegsData);
                const res = await axios.post("http://localhost:8000/getUserNonce", {
                    address
                });
                if (res.status == 200) {
                    console.log("Fetched nonce", res.data);
                    const retrievedData = res.data;
                    setNonce(retrievedData.nonce);
                }
                else if (res.status == 404) {
                    console.log("Nonce not found");
                }
                else {
                    console.log("Internal Server Error");
                }
                const sodium = await SodiumPlus.auto();
                console.log("Nonce", nonce);
                const cipherText = await sodium.crypto_box(donorRegsDataString, nonce, secK, patientPubK);
                console.log("Cipher", cipherText);
                console.log("Type of ciphertest", typeof cipherText);
                const blob = new Blob([JSON.stringify(cipherText)], { type: 'application/json' });
                const cid = await client.add(blob);
                console.log("CID of Donor Registration:", cid.path);
                const trxDataStorage = await createEthereumContract();
                const storeIPFS = await trxDataStorage.populateTransaction.donorStoreIPFS(uniqueId, cid.path);
                const trx = {
                    to: contractAddress,
                    data: storeIPFS.data
                }
                console.log("Jakayw", trx);
                const transactionArray = [];
                transactionArray.push(trx);
                const userOp = await smartWallet2.buildUserOp(transactionArray, {
                    params: {
                        sessionSigner: sessionSigner,
                        sessionValidationModule: abiSVMAddress,
                    },
                });

                const userOpResponse = await smartWallet2.sendUserOp(userOp, {
                    sessionSigner: sessionSigner,
                    sessionValidationModule: abiSVMAddress,
                });
                console.log("Store IPFS userOp", userOpResponse);
                const userOpReceipt = await userOpResponse.wait();
                console.log("Strore IPFS userOPReceipt", userOpReceipt);
                if (userOpReceipt.success == "true") {
                    const approved = await trxDataStorage.populateTransaction.setStatus(uniqueId, true);
                    const trx = {
                        to: contractAddress,
                        data: approved.data
                    }
                    console.log("Jakayw", trx);
                    const transactionArray = [trx];
                    const userOp2 = await smartWallet2.sendTranscation(transactionArray, {
                        params: {
                            sessionSigner: sessionSigner,
                            sessionValidationModule: abiSVMAddress,
                        }
                    });
                    console.log("Approved userOP2", userOp2);
                    const userOp2Receipt = await userOp2.wait();
                    console.log("Approved userOp2Receipt", userOp2Receipt);
                    if (userOp2Receipt.success == "true") {
                        console.log("Assign approved");
                    }
                    else {
                        console.log("Couldn't assign approved");
                    }
                }
                else {
                    console.log("COULDN'T STORE IN IPFS");
                }
            }
            else {
                const trxDataStorage = await createEthereumContract();
                const rejected = await trxDataStorage.populateTransaction.setStatus(uniqueId, false);
                const trx = {
                    to: contractAddress,
                    data: rejected.data
                }
                console.log("Jakayw", trx);
                const transactionArray = [trx];
                const userOp = await smartWallet2.sendTranscation(transactionArray, {
                    params: {
                        sessionSigner: sessionSigner,
                        sessionValidationModule: abiSVMAddress,
                    }
                });
                const userOpReceipt = await userOp.wait();
                console.log("Approved userOp2Receipt", userOpReceipt);
                if (userOpReceipt.success == "true") {
                    console.log("REJECT DONE");
                }
                else {
                    console.log("REVERTED in REJECTED");
                }
            }
        } catch (error) {
            console.log("Error in IPFS store", error);
        }
    }

    async function addAuthorizer() {
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const data = {
            name: authName,
            email: authEmail,
            address: authWalletAddress,
            position: position
        }

        const blob = new Blob([JSON.stringify(data)], { type: "application/json" })

        try {
            if (window.ethereum) {
                const cid = await client.add(blob);
                console.log("CID", cid);

                const transactionContract = await createEthereumContract();
                const trx_Hash = await transactionContract.setCid_AuthAcc(authWalletAddress, cid.path);
                await trx_Hash.wait();
                console.log("Authorizer added", trx_Hash.hash);
            }
            else {
                console.log("No Wallet Detected");
            }
        } catch (error) {
            console.log("Error is:", error);
        }
    }

    const formCreate = (
        <>
            <div className="modal_container_2">
                <strong>Add Authorizer</strong>
                <form className="formStyle" onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Name*:</label>
                        <input type="text" className="form-control" value={authName} onChange={(e) => setAuthName(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email*:</label>
                        <input type="email" className="form-control" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Position*:</label>
                        <input type="text" className="form-control" value={position} onChange={(e) => setPosition(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Wallet Address*:</label>
                        <input type="text" className="form-control" value={authWalletAddress} onChange={(e) => setAuthWalletAddress(e.target.value)} required />
                    </div>
                    <div className="form_submit">
                        <input className="cntr" type="submit" />
                    </div>
                </form>
            </div>
        </>
    );

    const genAuthKeys = async () => {
        const sodium = await SodiumPlus.auto();
        const keypair = await sodium.crypto_box_keypair();
        const privateKeyObj = await sodium.crypto_box_secretkey(keypair);
        const publicKeyObj = await sodium.crypto_box_publickey(keypair);
        const privateKey = privateKeyObj.buffer;
        const publicKey = publicKeyObj.buffer;

        try {
            const res = await axios.post("https://localhost:8000/uploadAuthKeys", {
                publicKey,
                privateKey
            });
            if (res.data !== 500) {
                const bufferP = Buffer.from(res.data.publicKey);
                const bufferS = Buffer.from(res.data.privateKey);

                const pubK = new X25519PublicKey(bufferP);
                const secK = new X25519SecretKey(bufferS);
                setAuthPubK(pubK);
                setAuthSecK(secK);
                setAuthKeys(false);
            }
            else
                console.log("Internal Server Error");
        } catch (error) {
            console.log("Error msg", error.message);
        }

        try {
            const res = await axios.post("https://localhost:8000/uploadAuthPubKey", {
                publicKey
            })
            if (res.data !== 500)
                console.log("Data", res.data);
            else
                console.log("Internal Server Error");
        } catch (error) {
            console.log("Error", error.message);
        }

    }

    function showAuthKeys() {
        setDecryptedPubK(authPubK.toString('hex'));
        setDecryptedSecK(authSecK.toString('hex'));
        setShowKeys(true);
    }

    const displayKeys = (
        <>
            <h2>Authorizer Keys</h2>
            <h3>Public Key: {decryptedPubK}</h3>
            <h3>Private Key: {decryptedSecK}</h3>
        </>
    )

    function idPDF(idProofUrl) {
        if (idProofUrl) {
            console.log("ID proof", idProofUrl);
            window.open(idProofUrl, "_blank");
        } else {
            console.log("No ID proof available.");
        }
    }

    function medPDF(medicalRecordUrl) {
        if (medicalRecordUrl) {
            window.open(medicalRecordUrl, "_blank");
        } else {
            console.log("No medical record available.");
        }
    }

    function nocPDF(nocUrl) {
        if (nocUrl) {
            window.open(nocUrl, "_blank");
        }
        else {
            console.log("No NOC provided");
        }
    }

    async function startVote(donorData, smartWallet2) {
        donorData.map(async (donordata) => {
            if (!donordata.voteStarted && !donordata.voteEnd) {
                const uniqueId = donordata.uniqueId;
                console.log("NOSON", uniqueId);
                // get session key from local storage
                const sessionKeyPrivKey = window.localStorage.getItem("sessionSigner");
                console.log("sessionKeyPrivKey", sessionKeyPrivKey);
                if (!sessionKeyPrivKey) {
                    alert("Session key not found please create session");
                    return;
                }
                const sessionSigner = new ethers.Wallet(sessionKeyPrivKey, provider);
                console.log("sessionSigner", sessionSigner);

                // generate sessionModule
                const sessionModule = await createSessionKeyManagerModule({
                    moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
                    smartAccountAddress: smartWalletAddress2,
                });
                console.log("Session Module", sessionModule);
                // set active module to sessionModule
                console.log("Smart Wallet", smartWallet2);
                smartWallet2 = await smartWallet2.setActiveValidationModule(sessionModule);
                console.log("Balance", await smartWallet2.getBalances());
                const transactionContractVote = await createEthereumContractVote();
                const startTime = Date.now();
                const { data } = await transactionContractVote.populateTransaction.startElection(uniqueId, startTime);
                const tx = {
                    to: contractAddress2,
                    data: data,
                };

                console.log("Jakayw");
                const transactionArray = [];
                transactionArray.push(tx);
                try {
                    let userOp = await smartWallet2.buildUserOp(transactionArray, {
                        params: {
                            sessionSigner: sessionSigner,
                            sessionValidationModule: abiSVMAddress,
                        },
                    });
                    console.log("User Op", userOp);

                    const userOpResponse = await smartWallet2.sendUserOp(userOp, {
                        sessionSigner: sessionSigner,
                        sessionValidationModule: abiSVMAddress,
                    });

                    console.log("userOpHash", userOpResponse);
                    const userOpReceipt = await userOpResponse.wait();
                    console.log("txHash", userOpReceipt);

                    if (userOpReceipt.success == "true") {
                        console.log("User Op Receipt", userOpReceipt);
                        console.log("Transaction Receipt", userOpReceipt.receipt);
                        setUserDatas(prevUserDatas => {
                            const updatedUserDatas = prevUserDatas.map(userData => {
                                console.log("Data UID", userData.uniqueId);
                                console.log("UID", uniqueId);
                                if (userData.uniqueId == uniqueId) {
                                    return {
                                        ...userData,
                                        voteStarted: true
                                    }
                                }
                            });
                            return updatedUserDatas;
                        })
                    }
                    else
                        console.log("REVERTED");
                } catch (error) {
                    console.log("Could start vote", error);
                }
            }
        })
    }

    const over = (
        <>
            Voting Ended
        </>
    )

    const notStarted = (
        <>
            Voting not yet started
        </>
    )

    const timer = (minutes, seconds) => `${minutes < 10 ? "0" + minutes : minutes}:${seconds}`;
    return (
        <div style={{ textAlign: "center" }}>
            <h1>Admin Page</h1>
            {admin && (
                <>
                    <button className="bttn" onClick={addAuthorizer}>Add New Authorizer</button>
                    {authKeys ? (<button className="bttn" style={{ marginLeft: '5px' }} onClick={genAuthKeys}>Generate Authorizer Keys</button>) : (<button className="bttn" style={{ marginLeft: '5px' }} onClick={showAuthKeys}>Show Authorizer Keys</button>)}
                    {showForm && formCreate}
                    {showKeys && displayKeys}
                    <br />
                    <br />
                    <CreateSession smartAccount={smartWallet2} address={smartWalletAddress2} provider={provider} />
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Donor Name</th>
                                <th>Recipient Name</th>
                                <th>Reltion with Donor</th>
                                <th>Organ</th>
                                <th>Donor's Address</th>
                                <th>Phone Number</th>
                                <th>Donor's Id Proof</th>
                                <th>Donor's Medical Record</th>
                                <th>Donor's NOC</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userDatas.map((patientData, index) => (
                                <tr key={index}>
                                    <td>{patientData.type}</td>
                                    <td>{patientData.donorName}</td>
                                    <td>{patientData.recipientName}</td>
                                    <td>{patientData.relationship}</td>
                                    <td>{patientData.selectedOrgan}</td>
                                    <td>{patientData.donorAddress}</td>
                                    <td>{patientData.donorPhnNumber}</td>
                                    <td><button onClick={() => idPDF(patientData.idProofUrl)}>View Id proof</button></td>
                                    <td><button onClick={() => medPDF(patientData.medicalRecordUrl)}>View Medical Data</button></td>
                                    <td><button onClick={() => nocPDF(patientData.nocUrl)}>View NOC</button></td>
                                    <td>{patientData.voteStarted ? (patientData.voteEnd ? over : timer(patientData.minutes, patientData.seconds)) : (notStarted)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

export default Admin;