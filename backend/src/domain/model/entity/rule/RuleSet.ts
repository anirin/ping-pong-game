import { InvalidArgumentError } from "../../common/errors.js";
import type { RoomType, RuleSetId } from "../../common/types.js";

export class RuleSet {
	constructor(
		public readonly id: RuleSetId,
		public readonly pointToWin: number,
		public readonly maxPlayers: number,
		public readonly timeouts?: number,
		public readonly ballSpeed?: number,
		public readonly boardSpeed?: number,
		public readonly roomType?: RoomType,
	) {
		if (pointToWin <= 0)
			throw new InvalidArgumentError("pointToWin must be > 0");
		if (maxPlayers <= 0)
			throw new InvalidArgumentError("maxPlayers must be > 0");
	}
}

export class EffectiveRuleSet {
	constructor(
		public readonly pointToWin: number,
		public readonly maxPlayers: number,
		public readonly timeouts?: number,
		public readonly ballSpeed?: number,
		public readonly boardSpeed?: number,
		public readonly roomType?: RoomType,
	) {}
	static snapshot(base: RuleSet, overrides?: Partial<EffectiveRuleSet>) {
		return new EffectiveRuleSet(
			overrides?.pointToWin ?? base.pointToWin,
			overrides?.maxPlayers ?? base.maxPlayers,
			overrides?.timeouts ?? base.timeouts,
			overrides?.ballSpeed ?? base.ballSpeed,
			overrides?.boardSpeed ?? base.boardSpeed,
			overrides?.roomType ?? base.roomType,
		);
	}
}
