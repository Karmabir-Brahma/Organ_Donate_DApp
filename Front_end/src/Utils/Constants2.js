import abi from "./ContractAbi2.json";
import { ethers } from "ethers";

export const contractAddress2 = "0xAb17AafE4cE33dC4f5C46C08B42E47547F678c17";
const contractAbi = abi.abi;
export async function createEthereumContractVote() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const transactionsContract = new ethers.Contract(contractAddress2, contractAbi, signer);
        return transactionsContract;
    } catch (error) {
        console.log("Error constant2 ow", error.message);
    }
}