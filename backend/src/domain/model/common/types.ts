export type UserId = string
export type RoomId = string
export type MatchId = string
export type TournamentId = string
export type RuleSetId = string

export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type MatchStatus = 'scheduled' | 'playing' | 'finished' | 'canceled'
export type TournamentStatus = 'waiting' | 'ongoing' | 'finished'
export type RoomType = '1on1' | 'multi'
export type Role = 'player' | 'spectator'