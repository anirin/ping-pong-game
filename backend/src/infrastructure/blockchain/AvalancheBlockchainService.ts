import { ethers } from "ethers";
import TournamentScoreABI from "../abi/contracts/TournamentScore.sol/TournamentScore.json" with {
	type: "json",
};

export class AvalancheBlockchainService {
	private static instance: AvalancheBlockchainService;
	private wallet: ethers.Wallet | null = null;
	private contract: ethers.Contract | null = null;
	private isInitialized = false;

	private constructor() {
		const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
		const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
		const contractAddress = process.env.CONTRACT_ADDRESS;

		if (!rpcUrl || !privateKey || !contractAddress) {
			console.error(
				"[Blockchain] Service not initialized: Missing environment variables.",
			);
			return;
		}

		try {
			const provider = new ethers.JsonRpcProvider(rpcUrl);

			this.wallet = new ethers.Wallet(privateKey, provider);
			this.contract = new ethers.Contract(
				contractAddress,
				TournamentScoreABI.abi,
				this.wallet,
			);
			this.isInitialized = true;
			console.log(
				"AvalancheBlockchainService initialized successfully (using in-memory Hardhat Network).",
			);
		} catch (error) {
			console.error("Failed to initialize AvalancheBlockchainService:", error);
		}
	}

	public static getInstance(): AvalancheBlockchainService {
		if (!AvalancheBlockchainService.instance) {
			AvalancheBlockchainService.instance = new AvalancheBlockchainService();
		}
		return AvalancheBlockchainService.instance;
	}

	public async recordMatchResult(
		matchId: string,
		tournamentId: string,
		player1Id: string,
		player2Id: string,
		player1Score: number,
		player2Score: number,
		winnerId: string,
	): Promise<string> {
		if (!this.isInitialized || !this.contract || !this.wallet) {
			throw new Error("BlockchainService is not properly initialized.");
		}
		try {
			if (typeof this.contract.recordMatchResult !== "function") {
				throw new Error(
					"The 'recordMatchResult' function does not exist on the smart contract.",
				);
			}

			console.log(`[Blockchain] Recording match result for ID: ${matchId}`);

			const txResponse: ethers.TransactionResponse =
				await this.contract.recordMatchResult(
					matchId,
					tournamentId,
					player1Id,
					player2Id,
					player1Score,
					player2Score,
					winnerId,
				);

			console.log(`[Blockchain] Transaction sent! Hash: ${txResponse.hash}`);

			const receipt = await txResponse.wait();
			if (!receipt) throw new Error("Transaction receipt is null.");

			return receipt.hash;
		} catch (error) {
			throw new Error("Failed to record match result on blockchain.");
		}
	}
}
