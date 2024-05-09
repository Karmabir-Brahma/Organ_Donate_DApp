import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../Helper/Modal";
import { createEthereumContract } from "../Utils/Constants";

function Home() {
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    async function admminConnect() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                window.localStorage.setItem("address", account);
                const transactionsContract = await createEthereumContract();
                const result = await transactionsContract.checkAdmin();
                if (result.toLowerCase() === account.toLowerCase()) {
                    console.log("Yes");
                    navigate("/Admin");
                }
                else {
                    navigate("/Error");
                }

            } catch (error) {
                console.log("Wrong:", error);
            }
        }
        else {
            setShowModal(true);
            console.log("Wallet not detected");
        }
    }

    async function authorizerConnect() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                window.localStorage.setItem("address", accounts[0]);
                const transactionsContract = await createEthereumContract();
                const result = await transactionsContract.checkAuthorizers(accounts[0]);
                if (result) {
                    navigate("/Authorizer");
                }
                else {
                    navigate("/Error");
                }

            } catch (error) {
                console.log("Wrong:", error);
            }
        }
        else {
            setShowModal(true);
            console.log("Wallet not detected");
        }
    }

    async function userConnect() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                window.localStorage.setItem("address", accounts[0]);
                navigate("/User");
            }
            catch (error) {
                console.log("User denied to connect");
            }
        }
        else {
            setShowModal(true);
            console.log("Wallet not detected");
        }
    }

    const closeModal = () => setShowModal(false);

    return (
        <>
            <div>
                <div className="cntr">
                    <h1><span><strong>Empowering Organ Donation</strong></span></h1>
                    <h1><span><strong>and</strong></span></h1>
                    <h1> <strong>Transplantation with Blockchian Technology</strong></h1>
                    <div>
                        <button className="bttn" onClick={userConnect}>Connect as a User</button>
                        <span style={{ margin: '0 10px' }}></span>
                        <button className="bttn" onClick={authorizerConnect}>Connect as an Authorizer</button>
                        <span style={{ margin: '0 10px' }}></span>
                        <button className="bttn" onClick={admminConnect}>Connect as an Admin</button>
                    </div>
                    {showModal && <Modal closeModal={closeModal} />}
                </div>
            </div>
        </>
    )
}

export default Home;