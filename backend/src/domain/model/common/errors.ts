export class DomainError extends Error {}
export class InvalidArgumentError extends DomainError {}
export class InvalidTransitionError extends DomainError {}
export class AlreadyJoinedError extends DomainError {}
export class RoomFullError extends DomainError {}
export class NotParticipantError extends DomainError {}