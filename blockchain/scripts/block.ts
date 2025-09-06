import { ethers } from "hardhat";

async function main() {
  // --- ▼▼▼ 設定してください ▼▼▼ ---
  const blockNumberToInspect = 6;
  // --- ▲▲▲ 設定はここまで ▲▲▲ ---

  console.log(`\n🔍 Inspecting Block #${blockNumberToInspect}...`);

  const provider = ethers.provider;
  const block = await provider.getBlock(blockNumberToInspect);

  if (!block) {
    console.log(`\n❌ Block #${blockNumberToInspect} not found.`);
    return;
  }

  console.log("\n✅ Block found! Details below:");
  console.log("---------------------------------------------");
  console.log(`  Block Number:  ${block.number}`);
  console.log(`  Timestamp:     ${new Date(block.timestamp * 1000).toLocaleString()}`);
  console.log(`  Transactions:  ${block.transactions.length} transaction(s)`);
  console.log("---------------------------------------------\n");
  
  if (block.transactions.length > 0) {
    console.log("--- Transactions in this block ---");
    for (const txHash of block.transactions) {
      console.log(`  - ${txHash}`);
      // さらに詳細を知りたければ、トランザクションの詳細も取得できる
      // const tx = await provider.getTransaction(txHash);
      // console.log(tx);
    }
    console.log("----------------------------------\n");
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exitCode = 1;
});