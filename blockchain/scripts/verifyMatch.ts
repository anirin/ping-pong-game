import { ethers } from "hardhat";
// ABIファイルを直接インポートして、エラーを回避します
import TournamentScoreABI from "../../backend/src/infrastructure/abi/contracts/TournamentScore.sol/TournamentScore.json";

async function main() {
	// --- ▼▼▼ 設定値 ▼▼▼ ---

	// 1. backend/.env に設定した【コントラクトのアドレス】をここに貼り付けます
	//    (0x5Fb... で始まるはずです)
	const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

	// 2. 確認したい試合のIDを、バックエンドのログからコピーして貼り付けます
	const matchIdToVerify = "a8e1ede8-0df1-47bc-9b6c-e92849106cf6";

	// --- ▲▲▲ 設定値ここまで ▲▲▲ ---

	console.log(`\n🔍 Verifying data for Match ID: ${matchIdToVerify}`);
	console.log(`   On contract at address: ${contractAddress}`);

	const provider = ethers.provider;

	// new ethers.Contract() を使って、コントラクトインスタンスを明示的に作成します
	const tournamentScore = new ethers.Contract(
		contractAddress,
		TournamentScoreABI.abi,
		provider,
	);

	const result = await tournamentScore.matchResults(matchIdToVerify);

	if (Number(result.timestamp) === 0) {
		console.log("\n❌ No data found on the blockchain for this Match ID.");
		return;
	}

	console.log("\n✅ Data found on the blockchain! Details below:");
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
	console.error("❌ Verification script failed:", error);
	process.exitCode = 1;
});
