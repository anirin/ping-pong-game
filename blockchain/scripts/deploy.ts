import { ethers } from "hardhat";

async function main() {
	const signers = await ethers.getSigners();
	if (signers.length < 2) {
		throw new Error("Hardhat Network could not provide enough accounts.");
	}

	const backendAccount = signers[1];
	const backendAddress = backendAccount.address;

	const defaultHardhatPrivateKeyForAccount1 =
		"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

	console.log("----------------------------------------------------");
	console.log("  Generating Config for In-Memory Hardhat Network   ");
	console.log("----------------------------------------------------");
	console.log(`Backend Wallet Address (Owner): ${backendAddress}`);

	// デプロイ処理
	const tournamentScoreFactory =
		await ethers.getContractFactory("TournamentScore");
	const tournamentScore = await tournamentScoreFactory.deploy(backendAddress);

	await tournamentScore.waitForDeployment();
	const contractAddress = await tournamentScore.getAddress();

	console.log(`\n✅ Contract Address Calculated: ${contractAddress}`);

	console.log("\n📋 Copy these values into your backend's .env file:");
	console.log("----------------------------------------------------");
	console.log(`CONTRACT_ADDRESS=${contractAddress}`);
	console.log(
		`BACKEND_WALLET_PRIVATE_KEY=${defaultHardhatPrivateKeyForAccount1}`,
	);
	console.log("----------------------------------------------------");
	console.log("Note: BLOCKCHAIN_RPC_URL is NOT needed for this setup.");
	console.log("----------------------------------------------------\n");
}

main().catch((error) => {
	console.error("❌ Script Failed:", error);
	process.exitCode = 1;
});
