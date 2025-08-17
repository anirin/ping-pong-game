interface Match {
    id: number;
    player1: string;
    player2: string;
    winner?: string;
}

const tournament: Match[] = [
    { id: 1, player1: "Player 1", player2: "Player 2" },
    { id: 2, player1: "Player 3", player2: "Player 4" },
    { id: 3, player1: "", player2: "" }, // 決勝戦
];

function updateTournament(matchId: number, winner: string) {
    const match = tournament.find((m) => m.id === matchId);
    if (match) {
        match.winner = winner;
        if (matchId === 1) {
            tournament[2].player1 = winner;
        } else if (matchId === 2) {
            tournament[2].player2 = winner;
        }
        renderTournamentPage();
    }
}

export function renderTournamentPage(): void {
    const app = document.getElementById("app")!;
    app.innerHTML = `
        <div class="p-4 max-w-2xl w-full mx-auto">
            <h1 class="text-xl font-bold mb-4 text-center">Tournament Bracket</h1>
            <div class="flex flex-col space-y-6">
                <!-- 準決勝 -->
                <div class="flex justify-between items-center">
                    <!-- 左側マッチ -->
                    <div class="flex flex-col space-y-1 w-28">
                        <div class="flex items-center">
                            <div class="w-full p-2 bg-white rounded-md shadow text-center text-sm cursor-pointer hover:bg-gray-200 transition nav-link"
                                 onclick="window.updateTournament(1, '${tournament[0].player1}')">
                                ${tournament[0].player1}
                            </div>
                            <div class="w-6 h-0.5 ${tournament[0].winner === tournament[0].player1 ? 'bg-red-500' : 'bg-gray-400'}"></div>
                        </div>
                        <div class="flex items-center">
                            <div class="w-full p-2 bg-white rounded-md shadow text-center text-sm cursor-pointer hover:bg-gray-200 transition nav-link"
                                 onclick="window.updateTournament(1, '${tournament[0].player2}')">
                                ${tournament[0].player2}
                            </div>
                            <div class="w-6 h-0.5 ${tournament[0].winner === tournament[0].player2 ? 'bg-red-500' : 'bg-gray-400'}"></div>
                        </div>
                    </div>
                    <!-- 左側SVG線 -->
                    <svg class="w-8 h-12" viewBox="0 0 80 80" preserveAspectRatio="none">
                        <path d="M0 20 H40 V60 H80" stroke="${tournament[0].winner ? 'red' : 'gray'}" stroke-width="1.5" fill="none"/>
                    </svg>
                    <!-- 右側マッチ -->
                    <div class="flex flex-col space-y-1 w-28">
                        <div class="flex items-center">
                            <div class="w-full p-2 bg-white rounded-md shadow text-center text-sm cursor-pointer hover:bg-gray-200 transition nav-link"
                                 onclick="window.updateTournament(2, '${tournament[1].player1}')">
                                ${tournament[1].player1}
                            </div>
                            <div class="w-6 h-0.5 ${tournament[1].winner === tournament[1].player1 ? 'bg-red-500' : 'bg-gray-400'}"></div>
                        </div>
                        <div class="flex items-center">
                            <div class="w-full p-2 bg-white rounded-md shadow text-center text-sm cursor-pointer hover:bg-gray-200 transition nav-link"
                                 onclick="window.updateTournament(2, '${tournament[1].player2}')">
                                ${tournament[1].player2}
                            </div>
                            <div class="w-6 h-0.5 ${tournament[1].winner === tournament[1].player2 ? 'bg-red-500' : 'bg-gray-400'}"></div>
                        </div>
                    </div>
                    <!-- 右側SVG線 -->
                    <svg class="w-8 h-12" viewBox="0 0 80 80" preserveAspectRatio="none">
                        <path d="M0 20 H40 V60 H80" stroke="${tournament[1].winner ? 'red' : 'gray'}" stroke-width="1.5" fill="none"/>
                    </svg>
                </div>
                <!-- 決勝 -->
                <div class="flex justify-center items-center">
                    <div class="flex flex-col space-y-1 w-28">
                        <div class="flex items-center">
                            <div class="w-full p-2 bg-white rounded-md shadow text-center text-sm ${tournament[2].player1 ? 'cursor-pointer hover:bg-gray-200 transition' : 'opacity-50'} nav-link"
                                 onclick="window.updateTournament(3, '${tournament[2].player1}')">
                                ${tournament[2].player1 || "TBD"}
                            </div>
                            <div class="w-6 h-0.5 ${tournament[2].winner === tournament[2].player1 ? 'bg-red-500' : 'bg-gray-400'}"></div>
                        </div>
                        <div class="flex items-center">
                            <div class="w-full p-2 bg-white rounded-md shadow text-center text-sm ${tournament[2].player2 ? 'cursor-pointer hover:bg-gray-200 transition' : 'opacity-50'} nav-link"
                                 onclick="window.updateTournament(3, '${tournament[2].player2}')">
                                ${tournament[2].player2 || "TBD"}
                            </div>
                            <div class="w-6 h-0.5 ${tournament[2].winner === tournament[2].player2 ? 'bg-red-500' : 'bg-gray-400'}"></div>
                        </div>
                    </div>
                    <!-- 決勝SVG線 -->
                    <svg class="w-8 h-6" viewBox="0 0 80 40" preserveAspectRatio="none">
                        <path d="M0 20 H80" stroke="${tournament[2].winner ? 'red' : 'gray'}" stroke-width="1.5" fill="none"/>
                    </svg>
                    <div class="w-28 p-2 bg-white rounded-md shadow text-center text-sm font-bold">
                        ${tournament[2].winner || "Winner"}
                    </div>
                </div>
            </div>
            <!-- ナビゲーションリンク -->
            <div class="mt-4 flex justify-center space-x-4">
                <a href="/" class="nav-link text-blue-500 hover:underline text-sm">Home</a>
                <a href="/room/entrance" class="nav-link text-blue-500 hover:underline text-sm">Room Entrance</a>
            </div>
        </div>
    `;

    // グローバルスコープに関数を公開
    (window as any).updateTournament = updateTournament;
}