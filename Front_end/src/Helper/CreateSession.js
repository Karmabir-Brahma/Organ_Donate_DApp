import { useState, useEffect } from "react";
import { ethers } from "ethers";
// import { concat, hexlify, zeroPadValue } from "ethers/lib/utils";
import { hexConcat, hexZeroPad, parseEther } from "ethers/lib/utils";
import { DEFAULT_SESSION_KEY_MANAGER_MODULE, createSessionKeyManagerModule } from "@biconomy/account";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CreateSession({ smartAccount, address, provider }) {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] = useState(false);


    useEffect(() => {
        console.log("sma", smartAccount);
        let checkSessionModuleEnabled = async () => {
            if (!address || !smartAccount || !provider) {
                setIsSessionKeyModuleEnabled(false);
                return;
            }
            try {
                console.log("Smrt Acc", smartAccount);
                const nonce = await smartAccount.getNonce();
                console.log("Nonce", Number(nonce));
                const isEnabled = await smartAccount.isModuleEnabled(DEFAULT_SESSION_KEY_MANAGER_MODULE);
                console.log("isSessionKeyModuleEnabled", isEnabled);
                console.log("Balance", await smartAccount.getBalances());
                setIsSessionKeyModuleEnabled(isEnabled);
                return;
            } catch (err) {
                console.error("Err", err)
                setIsSessionKeyModuleEnabled(false);
                return;
            }
        }
        checkSessionModuleEnabled()
    }, [isSessionKeyModuleEnabled, address, smartAccount, provider])

    const getABISVMSessionKeyData = async (sessionKey, permission) => {
        let sessionKeyData = hexConcat([
            sessionKey,
            permission.destContract,
            permission.functionSelector,
            hexZeroPad(permission.valueLimit.toHexString(), 16),
        ]);
        return sessionKeyData;
    }

    const createSession = async (enableSessionKeyModule) => {
        toast.info('Creating Session...', { /* toast configurations */ });

        if (!address || !smartAccount || !provider) {
            alert('Please connect wallet first');
            return;
        }

        try {
            const abiSVMAddress = "0x7818f8713Dac316908d6cd57702F5204B187fEaf";
            const sessionSigner = ethers.Wallet.createRandom();
            const sessionKeyEOA = await sessionSigner.getAddress();
            console.log("SessionSigner", window.localStorage.getItem("sessionPKey"));
            const sessionModule = await createSessionKeyManagerModule({
                moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
                smartAccountAddress: address,
            });
            console.log("Session Signer(CS)", sessionSigner);
            console.log("Session MOdule(CS)", sessionModule);
            window.localStorage.setItem("sessionSigner", sessionSigner.privateKey);
            const contractAddress = "0xAb17AafE4cE33dC4f5C46C08B42E47547F678c17";
            const functionSelector = 0x9bdc8e15;
            // const functionSelector = hexDataSlice(id("startElection(string,uint)"), 0, 4);
            console.log("Function Selector", functionSelector);
            const sessionKeyData = await getABISVMSessionKeyData(sessionKeyEOA, {
                destContract: contractAddress,
                functionSelector: functionSelector,
                valueLimit: parseEther("0"),
            });
            console.log("Session Key Data", sessionKeyData);
            const sessionTxData = await sessionModule.createSessionData([
                {
                    validUntil: 0,
                    validAfter: 0,
                    sessionValidationModule: abiSVMAddress,
                    sessionPublicKey: sessionKeyEOA,
                    sessionKeyData: sessionKeyData,
                },
            ]);
            console.log("4 Data", sessionTxData);
            const setSessiontrx = {
                to: DEFAULT_SESSION_KEY_MANAGER_MODULE,
                data: sessionTxData.data,
            };
            console.log("5", setSessiontrx);
            const transactionArray = [];

            if (enableSessionKeyModule) {
                const enableModuleTrx = await smartAccount.getEnableModuleData(DEFAULT_SESSION_KEY_MANAGER_MODULE);
                console.log("Enable Module", enableModuleTrx);
                transactionArray.push(enableModuleTrx);
            }
            transactionArray.push(setSessiontrx);
            console.log("Transaction Array", transactionArray);
            let partialUserOp = await smartAccount.buildUserOp(transactionArray);
            console.log(partialUserOp)
            const userOpResponse = await smartAccount.sendUserOp(
                partialUserOp
            );
            console.log("UserOpResponse", userOpResponse);
            console.log(`userOp Hash: ${userOpResponse.userOpHash}`);
            const transactionDetails = await userOpResponse.wait();
            console.log("txHash", transactionDetails.receipt.transactionHash);
            setIsSessionActive(true);
            toast.success(`Success! Session created successfully`, { /* toast configurations */ });
        } catch (err) {
            console.error(err);
        }
    }


    return (
        <div>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />
            {isSessionKeyModuleEnabled ? (
                <button className="bttn" onClick={() => createSession(false)}>Create Session</button>
            ) : (
                <button className="bttn" onClick={() => createSession(true)}>
                    Enable and Create Session
                </button>
            )}
        </div>
    );
}

export default CreateSession;