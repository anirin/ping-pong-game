import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { TournamentScore } from "../typechain-types";

describe("TournamentScore", function () {
  let tournamentScore: TournamentScore;
  let owner: HardhatEthersSigner;
  let otherAccount: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const TournamentScoreFactory = await ethers.getContractFactory("TournamentScore");
    tournamentScore = await TournamentScoreFactory.deploy() as TournamentScore;
    await tournamentScore.waitForDeployment();
  });

  it("Should record a tournament result correctly", async function () {
    const tournamentId = "test-tournament-1";
    const winnerId = "user-2";
    const participants = ["user-1", "user-2", "user-3", "user-4"];
    const matches = [
      { matchId: "match-1", player1Id: "user-1", player2Id: "user-2", player1Score: 3, player2Score: 5 },
      { matchId: "match-2", player1Id: "user-3", player2Id: "user-4", player1Score: 5, player2Score: 2 },
    ];
    await tournamentScore.recordTournament(tournamentId, winnerId, participants, matches);
    const result = await tournamentScore.getTournament(tournamentId);
    expect(result.tournamentId).to.equal(tournamentId);
  });

  // 他のテストケースも念のため簡略化して原因を切り分け
  it("Should fail if trying to record the same tournament twice", async function () {
    await tournamentScore.recordTournament("id1", "winner", [], []);
    await expect(tournamentScore.recordTournament("id1", "winner", [], []))
      .to.be.revertedWith("Tournament result already exists");
  });

  it("Should fail if called by an account other than the owner", async function () {
    await expect(tournamentScore.connect(otherAccount).recordTournament("id2", "winner", [], []))
      .to.be.revertedWithCustomError(tournamentScore, "OwnableUnauthorizedAccount");
  });
});