// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// コントラクト名はTournamentScoreのまま
contract TournamentScore is Ownable {
    // 保存するデータはMatchResult（試合結果）
    struct MatchResult {
        string matchId;       // MatchのUUID
        string tournamentId;  // TournamentのUUID
        string player1Id;
        string player2Id;
        uint8 player1Score;
        uint8 player2Score;
        string winnerId;
        uint256 timestamp;
    }

    // MatchのUUIDをキーとして結果を保存
    mapping(string => MatchResult) public matchResults;

    event MatchResultRecorded(
        string indexed matchId,
        string indexed tournamentId,
        string winnerId
    );
    
    // バックエンドのウォレットアドレスをオーナーとして受け取るコンストラクタ
    constructor(address initialOwner) Ownable(initialOwner) {}

    // 関数名は recordMatchResult
    function recordMatchResult(
        string memory _matchId,
        string memory _tournamentId,
        string memory _player1Id,
        string memory _player2Id,
        uint8 _player1Score,
        uint8 _player2Score,
        string memory _winnerId
    ) public onlyOwner {
        require(bytes(matchResults[_matchId].matchId).length == 0, "Match result already exists");

        matchResults[_matchId] = MatchResult({
            matchId: _matchId,
            tournamentId: _tournamentId,
            player1Id: _player1Id,
            player2Id: _player2Id,
            player1Score: _player1Score,
            player2Score: _player2Score,
            winnerId: _winnerId,
            timestamp: block.timestamp
        });

        emit MatchResultRecorded(_matchId, _tournamentId, _winnerId);
    }
}