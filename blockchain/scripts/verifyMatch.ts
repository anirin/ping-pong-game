import { ethers } from "hardhat";
import TournamentScoreABI from "/app/src/infrastructure/abi/contracts/TournamentScore.sol/TournamentScore.json";

async function main() {
	const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

	const matchIdToVerify = "bf80693e-9977-4dde-8e64-d3ab692df823";

	console.log(`Verifying data for Match ID: ${matchIdToVerify}`);
	console.log(`   On contract at address: ${contractAddress}`);

	const provider = ethers.provider;

	const tournamentScore = new ethers.Contract(
		contractAddress,
		TournamentScoreABI.abi,
		provider,
	);

	const result = await tournamentScore.matchResults(matchIdToVerify);

	if (Number(result.timestamp) === 0) {
		console.log("\nNo data found on the blockchain for this Match ID.");
		return;
	}

	console.log("\n Data found on the blockchain! Details below:");
	console.log("---------------------------------------------");
	console.log(`  Match ID:       ${result.matchId}`);
	console.log(`  Tournament ID:  ${result.tournamentId}`);
	console.log(`  Player 1 ID:    ${result.player1Id}`);
	console.log(`  Player 2 ID:    ${result.player2Id}`);
	console.log(`  Player 1 Score: ${result.player1Score}`);
	console.log(`  Player 2 Score: ${result.player2Score}`);
	console.log(`  Winner ID:      ${result.winnerId}`);
	console.log(
		`  Recorded At:    ${new Date(Number(result.timestamp) * 1000).toLocaleString()}`,
	);
	console.log("---------------------------------------------\n");
}

main().catch((error) => {
	console.error(" Verification script failed:", error);
	process.exitCode = 1;
});
