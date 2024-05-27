import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";
import { createEthereumContract } from "../Utils/Constants";
import { createEthereumContractVote, contractAddress2 } from "../Utils/Constants2";
import { ethers } from "ethers";
import { createSmartAccountClient, PaymasterMode } from "@biconomy/account";

function Authorizer() {
    const [authPubK, setAuthPubK] = useState();
    const [authSecK, setAuthSecK] = useState();
    const [decryptedPubK, setDecryptedPubK] = useState("");
    const [decryptedSecK, setDecryptedSecK] = useState("");
    const [userDatas, setUserDatas] = useState([]);
    const [hideButton, setHideButton] = useState(false);

    const [name, setName] = useState("");
    const [position, setPosition] = useState("");
    const [mailid, setMailid] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [smartWallet2, setSmartWallet2] = useState("");

    const navigate = useNavigate();
    useEffect(() => {
        const fetchData = async () => {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = provider.getSigner();
                console.log("Signer", signer);
                //creating smart wallet
                let smartAccount = await createSmartAccountClient({
                    signer,
                    biconomyPaymasterApiKey: process.env.REACT_APP_BICONOMYPAYMASTERAPIKEY,
                    bundlerUrl: process.env.REACT_APP_BUNDLERURL,
                });
                setSmartWallet2(smartAccount);

                const res = await axios.get("http://localhost:8000/getAuthKeys");
                if (res.data !== 404) {
                    const bufferP = Buffer.from(res.data.publicKey);
                    const bufferS = Buffer.from(res.data.privateKey);

                    const pubK = new X25519PublicKey(bufferP);
                    const secK = new X25519SecretKey(bufferS);
                    setAuthPubK(pubK);
                    setAuthSecK(secK);
                    setDecryptedPubK(pubK.toString('hex'));
                    setDecryptedSecK(secK.toString('hex'));
                }
                else if (res.data === 404)
                    console.log("Data not found");
                else
                    console.log("Internal Server Error");
            } catch (error) {
                console.log("Error", error);
            }
        }

        async function getAuthInfo(signerAddress) {
            const transactionContract = await createEthereumContract();
            try {
                const data = await transactionContract.getCid_AuthAcc(signerAddress);
                console.log("Data", data);
                if (data) {
                    try {
                        const res = await fetch(`https://bkrgateway.infura-ipfs.io/ipfs/${data}`);
                        const resjson = await res.json();
                        setName(resjson.name);
                        setMailid(resjson.email);
                        setWalletAddress(resjson.address);
                        setPosition(resjson.position);
                    } catch (error) {
                        console.log("Error:", error);
                    }
                }
            } catch (error) {
                console.log("Error:", error);
            }
        }
        const authozierCheck = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const signerAddress = signer.getAddress();
            const transactionContract = await createEthereumContract();
            const _address = await transactionContract.checkAuthorizers(signerAddress);
            if (_address) {
                getAuthInfo(signerAddress);
                fetchData();
            }
            else {
                navigate("/Error");
            }
        }
        authozierCheck();
    }, []);

    async function showDatas() {
        try {
            const res = await axios.get("http://localhost:8000/getUserData");
            if (res.status === 200) {
                console.log("Fetched user datas", res.data);
                const retrievedData = res.data;
                const sodium = await SodiumPlus.auto();

                const patientDatas = retrievedData.map(async (data) => {
                    const nonce = Buffer.from(data.nonce);
                    const cipherText = Buffer.from(data.cipherText);
                    const cipherText2 = Buffer.from(data.cipherText2);
                    const cipherText3 = Buffer.from(data.cipherText3);
                    const cipherText4 = Buffer.from(data.cipherText4);
                    const bufferP = Buffer.from(data.publicKey);
                    const patientPubK = new X25519PublicKey(bufferP);

                    const decryptedBUff = await sodium.crypto_box_open(cipherText, nonce, authSecK, patientPubK);
                    const decryptedBUff2 = await sodium.crypto_box_open(cipherText2, nonce, authSecK, patientPubK); //id proof pdf
                    const decryptedBUff3 = await sodium.crypto_box_open(cipherText3, nonce, authSecK, patientPubK); //Med Record pdf
                    const decryptedBUff4 = await sodium.crypto_box_open(cipherText4, nonce, authSecK, patientPubK); //Noc pdf

                    const decryptedObj = JSON.parse(decryptedBUff.toString('utf-8'));

                    let url5;
                    if (decryptedObj.type == "Brain Death Donor") {
                        const cipherText5 = Buffer.from(data.cipherText5);
                        const decryptedBUff5 = await sodium.crypto_box_open(cipherText5, nonce, authSecK, patientPubK);
                        const pdfBlob5 = new Blob([decryptedBUff5], { type: "application/pdf" });
                        url5 = URL.createObjectURL(pdfBlob5);
                    }
                    const pdfBlob2 = new Blob([decryptedBUff2], { type: "application/pdf" });
                    const url2 = URL.createObjectURL(pdfBlob2);

                    const pdfBlob3 = new Blob([decryptedBUff3], { type: "application/pdf" });
                    const url3 = URL.createObjectURL(pdfBlob3);

                    const pdfBlob4 = new Blob([decryptedBUff4], { type: "application/pdf" });
                    const url4 = URL.createObjectURL(pdfBlob4);

                    let min = 0;
                    let sec = 0;
                    const transactionContractVote = await createEthereumContractVote();
                    const checkVoteStarted = await transactionContractVote.checkStartElection(decryptedObj.uniqueId);
                    console.log("Started", checkVoteStarted);

                    if (checkVoteStarted == true) {

                        const startTime = await transactionContractVote.checkStartTime(decryptedObj.uniqueId);
                        const time = Date.now() - Number(startTime);
                        const remainingTime = 3600000 - time;
                        console.log("Remaining Time", remainingTime);
                        console.log("UID", decryptedObj.uniqueId);

                        sec = Math.floor((remainingTime / 1000) % 60);
                        min = Math.floor((remainingTime / 1000 / 60) % 60);
                        const timeOutId = setTimeout(async () => {
                            clearInterval(intervalId);
                            const checkVoteEnded = await transactionContractVote.checkEndElection(decryptedObj.uniqueId);
                            if (checkVoteEnded) {

                                setUserDatas(prevUserDatas => {
                                    const updatedUserDatas = prevUserDatas.map(userData => {
                                        console.log("HI");
                                        if (userData.uniqueId === decryptedObj.uniqueId) {
                                            console.log("ended");
                                            return {
                                                ...userData,
                                                disableButton: true,
                                                voteEnd: true,
                                                idProofUrl: null,
                                                medicalRecordUrl: null,
                                                nocUrl: null,
                                                bscUrl: null
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
                                            disableButton: false,
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
                        bscUrl: url5,
                        disableButton: true,
                        voteEnd: false,
                        minutes: min,
                        seconds: sec,
                    };
                    console.log("Per patient", patientDataWithUrls);
                    return patientDataWithUrls;
                });

                const pData = await Promise.all(patientDatas);
                setUserDatas(pData);
                setHideButton(true);
            } else if (res.status === 404) {
                console.log("Data not found");
            } else {
                console.log("Internal Server Error");
            }
        } catch (error) {
            console.log("User data fetch error", error);
        }
    }


    function idPDF(idProofUrl) {
        if (idProofUrl) {
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

    function bscPDF(bscUrl) {
        if (bscUrl) {
            window.open(bscUrl, "_blank");
        }
        else {
            console.log("No NOC provided");
        }
    }

    const over = (
        <>
            Voting Ended
        </>
    )

    const notOver = (minutes, seconds) => `${minutes < 10 ? "0" + minutes : minutes}:${seconds}`;

    async function aVote(uniqueId) {
        const transactionContractVote = await createEthereumContractVote();
        const trx_Hash = await transactionContractVote.populateTransaction.vote(walletAddress, name, "Yes", uniqueId);
        const trx = {
            to: contractAddress2,
            data: trx_Hash.data
        }
        const userOpResponse = await smartWallet2.sendTransaction(trx, {
            paymasterServiceData: { mode: PaymasterMode.SPONSORED },
        });

        const { transactionHash } = await userOpResponse.waitForTxHash();
        console.log("Transaction Hash", transactionHash);
        const userOpReceipt = await userOpResponse.wait();
        if (userOpReceipt.success == 'true') {
            console.log("UserOp receipt", userOpReceipt)
            console.log("Transaction receipt", userOpReceipt.receipt)
        }
        else {
            console.log("Approve vote aa jayaswi", userOpReceipt);
        }
    }

    async function rVote(uniqueId) {
        const transactionContractVote = await createEthereumContractVote();
        const trx_Hash = await transactionContractVote.populateTransaction.vote(walletAddress, name, "No", uniqueId);
        const trx = {
            to: contractAddress2,
            data: trx_Hash.data
        }
        const userOpResponse = await smartWallet2.sendTransaction(trx, {
            paymasterServiceData: { mode: PaymasterMode.SPONSORED },
        });

        const { transactionHash } = await userOpResponse.waitForTxHash();
        console.log("Transaction Hash", transactionHash);
        const userOpReceipt = await userOpResponse.wait();
        if (userOpReceipt.success == 'true') {
            console.log("UserOp receipt", userOpReceipt)
            console.log("Transaction receipt", userOpReceipt.receipt)
        }
        else {
            console.log("Rejected vote aa yaswi", userOpReceipt);
        }
    }

    return (
        <div className="container">
            <h1 style={{ textAlign: "center" }}>Authorizer</h1>
            <div>
                <h2>Name: {name}</h2>
                <h2>Position: {position}</h2>
                <h2>Mail id: {mailid}</h2>
                <h2>Wallet Address: {walletAddress}</h2>
            </div>
            {hideButton ? (
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Donor Name</th>
                            <th>Recipient Name</th>
                            <th>Reltion with Recipient</th>
                            <th>Reltion with Donor</th>
                            <th>Organ</th>
                            <th>Donor's Address</th>
                            <th>Phone Number</th>
                            <th>Donor's Id Proof</th>
                            <th>Donor's Medical Record</th>
                            <th>NOC</th>
                            <th>Brain Stem Certificate</th>
                            <th>Time</th>
                            <th>Vote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {userDatas.map((patientData, index) => (
                            <tr key={index}>
                                <td>{patientData.type}</td>
                                <td>{patientData.donorName}</td>
                                <td>{patientData.recipientName ? patientData.recipientName : "N/A"}</td>
                                <td>{patientData.relationship ? patientData.relationship : "N/A"}</td>
                                <td>{patientData.donorRelation ? patientData.donorRelation : "N/A"}</td>
                                <td>{patientData.selectedOrgan}</td>
                                <td>{patientData.donorAddress}</td>
                                <td>{patientData.donorPhnNumber}</td>
                                <td>{patientData.idProofUrl ? (<button onClick={() => idPDF(patientData.idProofUrl)}>View Id proof</button>) : "---"}</td>
                                <td>{patientData.medicalRecordUrl ? (<button onClick={() => medPDF(patientData.medicalRecordUrl)}>View Medical Data</button>) : "---"}</td>
                                <td>{patientData.nocUrl ? (<button onClick={() => nocPDF(patientData.nocUrl)}>View NOC</button>) : "---"}</td>
                                <td>{patientData.bscUrl ? (<button onClick={() => bscPDF(patientData.bscUrl)}>Brain Stem Certificate</button>) : "N/A"}</td>
                                <td>{patientData.voteEnd ? over : notOver(patientData.minutes, patientData.seconds)}</td>
                                <td>
                                    <button disabled={patientData.disableButton} onClick={() => aVote(patientData.uniqueId)}>Approve</button>
                                    <button disabled={patientData.disableButton} onClick={() => rVote(patientData.uniqueId)} style={{ marginLeft: '5px' }}>Reject</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div>
                    <button onClick={showDatas}>Show User Datas</button>
                </div>
            )}

        </div>
    )
}

export default Authorizer;