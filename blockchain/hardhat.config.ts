import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
	solidity: "0.8.24",
	paths: {
		artifacts: "./abi",
	},
	networks: {
		blockchain: {
			url: process.env.BLOCKCHAIN_RPC_URL!,
		},
	},
};
export default config;
