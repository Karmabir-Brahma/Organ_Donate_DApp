import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";
import { createEthereumContract } from "../Utils/Constants";
import { ethers } from "ethers";

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

    const navigate = useNavigate();
    useEffect(() => {
        const fetchData = async () => {
            try {
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
                    const bufferP = Buffer.from(data.publicKey);
                    const patientPubK = new X25519PublicKey(bufferP);

                    const time = Date.now() - data.sentTime;
                    const remainingTime = 3600000 - time;
                    let disableButton = false;
                    let voteEnd = false;
                    let sec = Math.floor((time / 1000) % 60);
                    let min = Math.floor((time / 1000 / 60) % 60);

                    const timeOutId = setTimeout(() => {
                        disableButton = true;
                        voteEnd = true;
                        setUserDatas(prevUserDatas => {
                            const updatedUserDatas = prevUserDatas.map(userData => {
                                if (userData.id === data._id) {
                                    return {
                                        ...userData,
                                        disableButton: disableButton,
                                        voteEnd: voteEnd
                                    };
                                }
                                return userData;
                            });
                            return updatedUserDatas;
                        });
                        clearInterval(intervalId);
                    }, remainingTime);

                    const intervalId = setInterval(() => {
                        const time = Date.now() - data.sentTime;
                        sec = Math.floor((time / 1000) % 60);
                        min = Math.floor((time / 1000 / 60) % 60);
                        setUserDatas(prevUserDatas => {
                            const updatedUserDatas = prevUserDatas.map(userData => {
                                if (userData.id === data._id) {
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

                    const decryptedBUff = await sodium.crypto_box_open(cipherText, nonce, authSecK, patientPubK);
                    const decryptedBUff2 = await sodium.crypto_box_open(cipherText2, nonce, authSecK, patientPubK); //id proof pdf
                    const decryptedBUff3 = await sodium.crypto_box_open(cipherText3, nonce, authSecK, patientPubK); //Med Record pdf

                    const decryptedObj = JSON.parse(decryptedBUff.toString('utf-8'));

                    const pdfBlob2 = new Blob([decryptedBUff2], { type: "application/pdf" });
                    const url2 = URL.createObjectURL(pdfBlob2);

                    const pdfBlob3 = new Blob([decryptedBUff3], { type: "application/pdf" });
                    const url3 = URL.createObjectURL(pdfBlob3);

                    // Include PDF URLs in the patient data object
                    const patientDataWithUrls = {
                        ...decryptedObj,
                        idProofUrl: url2,
                        medicalRecordUrl: url3,
                        disableButton: disableButton,
                        voteEnd: voteEnd,
                        minutes: min,
                        seconds: sec,
                        id: data._id // Assuming each user data has a unique identifier
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

    const over = (
        <>
            Voting Ended
        </>
    )

    const notOver = (minutes, seconds) => `${minutes < 10 ? "0" + minutes : minutes}:${seconds}`;

    async function aVote() {

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
                            <th>Address</th>
                            <th>Phone Number</th>
                            <th>Donor's Id Proof</th>
                            <th>Donor's Medical Record</th>
                            <th>Vote</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {userDatas.map((patientData, index) => (
                            <tr key={index}>
                                <td>{patientData.type}</td>
                                <td>{patientData.donorName}</td>
                                <td>{patientData.recipientName}</td>
                                <td>{patientData.donorAddress}</td>
                                <td>{patientData.donorPhnNumber}</td>
                                <td><button onClick={() => idPDF(patientData.idProofUrl)}>View Id proof</button></td>
                                <td><button onClick={() => medPDF(patientData.medicalRecordUrl)}>View Medical Data</button></td>
                                <td>
                                    <button disabled={patientData.disableButton} onClick={aVote}>Approve</button>
                                    <button disabled={patientData.disableButton} style={{ marginLeft: '5px' }}>Reject</button>
                                </td>
                                <td>{patientData.voteEnd ? over : notOver(patientData.minutes, patientData.seconds)}</td>
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