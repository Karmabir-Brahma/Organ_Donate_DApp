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
import { createBundler, createSmartAccountClient, PaymasterMode, DEFAULT_SESSION_KEY_MANAGER_MODULE, createSessionKeyManagerModule } from "@biconomy/account";

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

function Admin() {
    const [admin, setAdmin] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [authKeys, setAuthKeys] = useState(false);
    const [showKeys, setShowKeys] = useState(false);
    const [authPubK, setAuthPubK] = useState("");
    const [authSecK, setAuthSecK] = useState("");
    const [userDatas, setUserDatas] = useState([]);
    let [smartWallet2, setSmartWallet2] = useState("");
    const [provider, setProvider] = useState("");
    const [smartWalletAddress2, setSmartWalletAddress2] = useState("");
    const [bundler, setBundler] = useState("");

    const [decryptedPubK, setDecryptedPubK] = useState("");
    const [decryptedSecK, setDecryptedSecK] = useState("");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authWalletAddress, setAuthWalletAddress] = useState("");
    const [position, setPosition] = useState("");

    const navigate = useNavigate();
    useEffect(() => {
        const setUp = async () => {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                setProvider(provider);
                const signer = provider.getSigner();
                console.log("Signer", signer);

                let smartAccount = await createSmartAccountClient({
                    signer,
                    biconomyPaymasterApiKey: process.env.REACT_APP_BICONOMYPAYMASTERAPIKEY,
                    bundlerUrl: process.env.REACT_APP_BUNDLERURL,
                });
                const bundler = await createBundler({
                    bundlerUrl: process.env.REACT_APP_BUNDLERURL
                });
                setBundler(bundler);
                setSmartWallet2(smartAccount);
                const smartWalletAddress = await smartAccount.getAccountAddress();
                setSmartWalletAddress2(smartWalletAddress);
                console.log("Smart Account Address:-", smartWalletAddress);
                console.log("Second", smartAccount);
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
                            const nonce = Buffer.from(data.nonce);
                            const cipherText = Buffer.from(data.cipherText);
                            const cipherText2 = Buffer.from(data.cipherText2);
                            const cipherText3 = Buffer.from(data.cipherText3);
                            const bufferP = Buffer.from(data.publicKey);
                            const patientPubK = new X25519PublicKey(bufferP);

                            const decryptedBUff = await sodium.crypto_box_open(cipherText, nonce, secK, patientPubK);
                            const decryptedBUff2 = await sodium.crypto_box_open(cipherText2, nonce, secK, patientPubK); //id proof pdf
                            const decryptedBUff3 = await sodium.crypto_box_open(cipherText3, nonce, secK, patientPubK); //Med Record pdf

                            const decryptedObj = JSON.parse(decryptedBUff.toString('utf-8'));
                            console.log("Decrypted Obj", decryptedObj);
                            const pdfBlob2 = new Blob([decryptedBUff2], { type: "application/pdf" });
                            const url2 = URL.createObjectURL(pdfBlob2);

                            const pdfBlob3 = new Blob([decryptedBUff3], { type: "application/pdf" });
                            const url3 = URL.createObjectURL(pdfBlob3);
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
                                        const abiSVMAddress = "0x7818f8713Dac316908d6cd57702F5204B187fEaf"
                                        // get session key from local storage
                                        const sessionKeyPrivKey = window.localStorage.getItem("sessionSigner");
                                        console.log("sessionKeyPrivKey", sessionKeyPrivKey);
                                        if (!sessionKeyPrivKey) {
                                            alert("Session key not found please create session");
                                            return;
                                        }
                                        const sessionSigner = new ethers.Wallet(sessionKeyPrivKey, provider);
                                        console.log("sessionSigner", sessionSigner);
                                        const sessionModule = await createSessionKeyManagerModule({
                                            moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
                                            smartAccountAddress: smartWalletAddress,
                                        });
                                        console.log("Session Module", sessionModule);
                                        // set active module to sessionModule
                                        console.log("Smart Wallet", smartAccount);
                                        smartAccount = await smartAccount.setActiveValidationModule(sessionModule);
                                        console.log("Balance", await smartAccount.getBalances());
                                        const endVote = await transactionContractVote.populateTransaction.endElection(decryptedObj.uniqueId);
                                        const tx = {
                                            to: contractAddress2,
                                            data: endVote.data
                                        }
                                        console.log("Jakayw", tx);
                                        const transactionArray = [];
                                        transactionArray.push(tx);
                                        let userOp = await smartAccount.buildUserOp(transactionArray, {
                                            params: {
                                                sessionSigner: sessionSigner,
                                                sessionValidationModule: abiSVMAddress,
                                            },
                                        });

                                        const userOpResponse = await smartAccount.sendUserOp(userOp, {
                                            sessionSigner: sessionSigner,
                                            sessionValidationModule: abiSVMAddress,
                                        });
                                        console.log("userOpHash", userOpResponse);
                                        const userOpReceipt = await userOpResponse.wait();
                                        console.log("txHash", userOpReceipt);
                                        if (userOpReceipt.success == "true") {
                                            console.log("User Op Receipt: ", userOpReceipt);
                                            console.log("Transaction Receipt: ", userOpReceipt.receipt);
                                            setUserDatas(prevUserDatas => {
                                                console.log("Konga");
                                                const updatedUserDatas = prevUserDatas.map(userData => {
                                                    if (userData.uniqueId === decryptedObj.uniqueId) {
                                                        flag = true;
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
                                    }
                                    if (!flag) {
                                        setUserDatas(prevUserDatas => {
                                            console.log("Konga");
                                            const updatedUserDatas = prevUserDatas.map(userData => {
                                                if (userData.uniqueId === decryptedObj.uniqueId) {
                                                    flag = true;
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
                        setUserDatas(pData);
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
                const trx_Hash = await transactionContract.setCid_AuthAcc.populateTransaction(authWalletAddress, cid.path);
                const tx = {
                    to: contractAddress,
                    data: trx_Hash.data
                }
                const userOpResponse = await smartWallet2.sendTranscation(tx, {
                    paymasterServiceData: { mode: PaymasterMode.SPONSORED }
                });
                const { transactionHash } = await userOpResponse.waitForTxHash();
                console.log("Trx hah", transactionHash);
                const userOpReceipt = await userOpResponse.wait();
                if (userOpReceipt.success == "true") {
                    console.log("User Op Receipt", userOpReceipt);
                    console.log("Receipt", userOpReceipt.receipt);
                }
                setAuthName("");
                setAuthEmail("");
                setPosition("");
                setAuthWalletAddress("");
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

    async function startVote(uniqueId) {
        const abiSVMAddress = "0x7818f8713Dac316908d6cd57702F5204B187fEaf"
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
        // const dummmySig = await smartWallet2.getDummySignatures({
        //     sessionSigner: sessionSigner,
        //     sessionValidationModule: abiSVMAddress,
        // });
        // console.log("Dummy Sig", dummmySig);


        console.log("Jakayw");
        const transactionArray = [];
        transactionArray.push(tx);

        // const bundler = await createBundler({
        //     bundlerUrl: process.env.REACT_APP_BUNDLERURL2
        // })
        // const gasEstimate = await bundler.estimateUserOpGas({
        //     initCode: "0x",
        //     nonce: "0x14",
        //     sender: "0x15062E0e6c30014e166CC3b7db3e3D700b055C29",
        //     signature: "0x00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000001c5b32f37f5bea87bdd5374eb2ac54ea8e0000000000000000000000000000000000000000000000000000000000000041584cd957baddf5e10819ea26afac00a3d98ee0ca36d1293ab21096b06bbee30262409957b0880a2901e21a36e601396a2b2937e834feccb988c911c780fb19a31b00000000000000000000000000000000000000000000000000000000000000",
        //     paymasterAndData: "0x",
        //     callData: "0x0000189a000000000000000000000000000002fbffedd9b33f4e7156f2de8d48945e74890000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000247cb64759f87038f5145789a3852b70eb26b9c50cb224cf32d82cd828261e0991683b75dd00000000000000000000000000000000000000000000000000000000"
        // });
        // console.log("Gas", gasEstimate);

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
        const userOpReceipt = await userOpResponse.wait(1);
        console.log("txHash", userOpReceipt);

        // const userOpResponse = await smartWallet2.sendTransaction(transactionArray, {
        //     params: {
        //         sessionSigner: sessionSigner,
        //         sessionValidationModule: abiSVMAddress,
        //     },
        // });
        // console.log("Partial", userOpResponse);
        // const { transactionHash } = await userOpResponse.waitForTxHash();
        // console.log("Start Election Trx hash", transactionHash);
        // console.log("UniqueID", uniqueId);
        // const userOpReceipt = await userOpResponse.wait();
        // console.log("Receipt", userOpReceipt);
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
                    <CreateSession smartAccount={smartWallet2} address={smartWalletAddress2} provider={provider} />
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
                                <th>Start Vote</th>
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
                                    <td><button disabled={patientData.disableButton} onClick={() => startVote(patientData.uniqueId)} >Start Vote</button></td>
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