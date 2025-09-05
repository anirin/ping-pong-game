// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TournamentScore is Ownable {
    struct MatchResult {
        string matchId;
        string player1Id;
        string player2Id;
        uint8 player1Score;
        uint8 player2Score;
    }

    struct TournamentResult {
        string tournamentId;
        string winnerId;
        string[] participants;
        MatchResult[] matches;
    }

    mapping(string => TournamentResult) public tournamentResults;

    event TournamentFinished(string indexed tournamentId, string winnerId);

    constructor() Ownable(msg.sender) {}

    function recordTournament(
        string memory _tournamentId,
        string memory _winnerId,
        string[] memory _participants,
        MatchResult[] memory _matches
    ) public onlyOwner {
        require(bytes(tournamentResults[_tournamentId].tournamentId).length == 0, "Tournament result already exists");

        TournamentResult storage newResult = tournamentResults[_tournamentId];
        newResult.tournamentId = _tournamentId;
        newResult.winnerId = _winnerId;
        newResult.participants = _participants;

        for (uint i = 0; i < _matches.length; i++) {
            newResult.matches.push(_matches[i]);
        }

        emit TournamentFinished(_tournamentId, _winnerId);
    }

    function getTournament(string memory _tournamentId)
        public
        view
        returns (
            string memory tournamentId,
            string memory winnerId,
            string[] memory participants,
            MatchResult[] memory matches
        )
    {
        TournamentResult storage result = tournamentResults[_tournamentId];
        return (
            result.tournamentId,
            result.winnerId,
            result.participants,
            result.matches
        );
    }
}