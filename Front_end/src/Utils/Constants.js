import abi from "./ContractAbi.json"
import { ethers } from "ethers";
//0xBC73daf94A1d404509431C046b11992CaB069c9f
// 0x04F2b68f3B8c85dF5Ae2bEc84F6B995dB6c773B3
export const contractAddress = "0x51e8dece1f94115d2Eb78B639603eB54AD5F2e34";
export const contractABI = abi.abi;
export async function createEthereumContract() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const transactionsContract = new ethers.Contract(contractAddress, contractABI, signer);
        return transactionsContract;
    } catch (error) {
        console.log("Error", error.message);
    }
}
