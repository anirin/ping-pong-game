import { ethers, network } from "hardhat";

async function main() {
  // --- ▼▼▼ 設定してください ▼▼▼ ---

  // 1. backend/.env に設定したコントラクトアドレスをここに貼り付けます
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // 2. 確認したい試合のIDを、バックエンドのログからコピーして貼り付けます
  //    例: [Blockchain] Recording match result for ID: 7e7e03cd-3cad-4191-9865-519efc1db044
  const matchIdToVerify = "e615837e-d77b-4a78-a329-f2c4bc41dee7";

  // --- ▲▲▲ 設定はここまで ▲▲▲ ---

  
  console.log(`\n🔍 Verifying data for Match ID: ${matchIdToVerify}`);
  console.log(`   On contract at address: ${contractAddress}`);

  // デプロイ済みのコントラクトに接続します
  const tournamentScore = await ethers.getContractAt("TournamentScore", contractAddress);

  // スマートコントラクトの `matchResults` マッピングを呼び出します。
  // publicなマッピングは、自動的に同じ名前のgetter関数が作られます。
  const result = await tournamentScore.matchResults(matchIdToVerify);

  // 結果が書き込まれているか確認
  // `result.timestamp` が 0 でなければ、データが存在する証拠です。
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
  console.log(`  Player 1 Score: ${result.player1Score}`); // .toString() は不要
  console.log(`  Player 2 Score: ${result.player2Score}`);
  console.log(`  Winner ID:      ${result.winnerId}`);
  console.log(`  Recorded At:    ${new Date(Number(result.timestamp) * 1000).toLocaleString()}`);
  console.log("---------------------------------------------\n");
}

main().catch((error) => {
  console.error("❌ Verification script failed:", error);
  process.exitCode = 1;
});