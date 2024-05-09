import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { createEthereumContract, contractAddress } from "../Utils/Constants";
import { createSmartAccountClient, PaymasterMode } from "@biconomy/account";
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

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

function Create() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [formFilled, setFormFilled] = useState();
    const navigate = useNavigate();

    useEffect(() => {
        if (window.ethereum) {
            async function Check() {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = await signer.getSigner();
                const signerAddress = await signer.getAddress();
                const transactionContract = await createEthereumContract();
                const cid = await transactionContract.getCid_DonorAcc(signerAddress);
                if (cid) {
                    setFormFilled(true);
                }
                else {
                    setFormFilled(false);
                }
            }
            Check();
        }
        else {
            console.log("Wallet Not Found");
        }
    }, [])

    async function handleSubmit(event) {
        event.preventDefault();
        const address = localStorage.getItem("address");
        const data = {
            name: name,
            email: email,
            address: address
        }

        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        const files = [new File([blob], 'info.json')]
        console.log("Files:", files);

        try {
            if (window.ethereum) {
                const provider = await window.ethereum.BrowserProvider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = await provider.getSigner();
                const smartWallet = await createSmartAccountClient({
                    signer,
                    biconomyPaymasterApiKey: process.env.REACT_APP_BICONOMYPAYMASTERAPIKEY,
                    bundlerUrl: process.env.REACT_APP_BUNDLERURL,
                });
                const saAddress = await smartWallet.getAccountAddress();
                console.log("Smart Account Address:", saAddress);
                //Adding user details into IPFS
                // const client = makeStorageClient();
                const cid = await client.add(blob);
                console.log("CID is", cid.path);

                //Adding cid to Blockchain
                const transactionsContract = await createEthereumContract();
                const trx_Hash = await transactionsContract.populateTransaction.setCid_DonorAcc(address, cid.path);
                const trx = {
                    to: contractAddress,
                    data: trx_Hash.data
                }
                const userOpResponse = await smartWallet.sendTransaction(trx, {
                    paymasterServiceData: { mode: PaymasterMode.SPONSORED },
                });
                console.log("TRX", trx);
                const { transactionHash } = await userOpResponse.waitForTxHash();
                console.log("Transaction Hash: ", transactionHash);

                const userOpReceipt = await userOpResponse.wait();
                if (userOpReceipt.success == "true") {
                    console.log("User Op Receipt: ", userOpReceipt);
                    console.log("Transaction Receipt: ", userOpReceipt.receipt);
                }
                window.localStorage.setItem("trx_hash", transactionHash);
                navigate("/User");
            }
            else {
                console.log("NO WALLET FOUND");
            }
        } catch (error) {
            console.log("Error is:", error);
        }
    }

    function handleClick(event) {
        event.preventDefault();
        navigate("/User");
    }

    const formView = (
        <>
            <div className="modal_container_2">
                <strong>Create Account</strong>
                <form className="formStyle" onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Name*:</label>
                        <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email*:</label>
                        <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form_submit">
                        <input className="cntr" type="submit" />
                    </div>
                </form>
            </div>
        </>
    )

    const filledView = (
        <>
            <div className="modal_wrapper_3" />
            <div className="modal_container_3">
                <p>You have already filled this form so, you can't fill it anymore</p>
                <div className="cntr">
                    <button onClick={handleClick}>Okay</button>
                </div>
            </div>
        </>
    );

    return (
        <>
            {formFilled ? filledView : formView}
        </>
    )
}

export default Create;