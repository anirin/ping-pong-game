import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { TournamentScore } from "../typechain-types";

describe("TournamentScore (for Match Results)", () => {
	let tournamentScore: TournamentScore;
	let owner: HardhatEthersSigner;
	let otherAccount: HardhatEthersSigner;

	beforeEach(async () => {
		[owner, otherAccount] = await ethers.getSigners();
		const TournamentScoreFactory =
			await ethers.getContractFactory("TournamentScore");
		tournamentScore = (await TournamentScoreFactory.deploy(
			owner.address,
		)) as TournamentScore;
		await tournamentScore.waitForDeployment();
	});

	describe("Deployment", () => {
		it("Should set the right owner", async () => {
			expect(await tournamentScore.owner()).to.equal(owner.address);
		});
	});

	describe("recordMatchResult", () => {
		it("Should record a match result correctly by the owner", async () => {
			const matchId = "match-uuid-1";
			const tournamentId = "tournament-uuid-1";
			const player1Id = "user-a";
			const player2Id = "user-b";
			const player1Score = 5;
			const player2Score = 3;
			const winnerId = "user-a";

			await tournamentScore
				.connect(owner)
				.recordMatchResult(
					matchId,
					tournamentId,
					player1Id,
					player2Id,
					player1Score,
					player2Score,
					winnerId,
				);

			const result = await tournamentScore.matchResults(matchId);

			expect(result.matchId).to.equal(matchId);
			expect(result.tournamentId).to.equal(tournamentId);
			expect(result.player1Score).to.equal(player1Score);
			expect(result.winnerId).to.equal(winnerId);
			expect(result.timestamp).to.be.gt(0); // タイムスタンプが記録されているか
		});

		it("Should fail if trying to record the same match twice", async () => {
			const matchId = "match-uuid-2";
			await tournamentScore.recordMatchResult(
				matchId,
				"t1",
				"p1",
				"p2",
				1,
				0,
				"p1",
			);

			await expect(
				tournamentScore.recordMatchResult(
					matchId,
					"t1",
					"p1",
					"p2",
					2,
					0,
					"p1",
				),
			).to.be.revertedWith("Match result already exists");
		});

		it("Should fail if called by an account other than the owner", async () => {
			const matchId = "match-uuid-3";

			await expect(
				tournamentScore
					.connect(otherAccount)
					.recordMatchResult(matchId, "t1", "p1", "p2", 1, 0, "p1"),
			).to.be.revertedWithCustomError(
				tournamentScore,
				"OwnableUnauthorizedAccount",
			);
		});
	});
});
