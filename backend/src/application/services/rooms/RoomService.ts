import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import type { UserRepository } from "@domain/interface/repository/users/UserRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import type { User } from "@domain/model/entity/user/User.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";
import {
	AvatarUrl,
	type UserId,
	Username,
} from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import { globalEventEmitter } from "@presentation/event/globalEventEmitter.js"; // 逆転しているやばい実装だが致し方なし
import { v4 as uuidv4 } from "uuid";

export class RoomService {
	private readonly roomRepository: RoomRepository;
	private readonly roomId: RoomId;

	// シングルトンインスタンスを管理するMap
	private static instances: Map<RoomId, RoomService> = new Map();

	constructor(roomId: RoomId) {
		this.roomId = roomId;
		const repository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
		this.roomRepository = repository;
	}

	// room idでシングルトンインスタンスを取得
	public static getInstance(roomId: RoomId): RoomService {
		if (!RoomService.instances.has(roomId)) {
			RoomService.instances.set(roomId, new RoomService(roomId));
		}
		return RoomService.instances.get(roomId)!;
	}

	// インスタンスを削除（roomが削除された時など）
	public static removeInstance(roomId: RoomId): void {
		RoomService.instances.delete(roomId);
	}

	// createRoom用の静的メソッド（roomIdがまだ存在しない場合）
	public static async createRoom(owner_id: string): Promise<Room> {
		const room = new Room(uuidv4(), owner_id, []);
		const repository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
		await repository.save(room);

		// ルーム作成後に参加者リストも初期化
		await repository.storeParticipants(room.id, []);

		return room;
	}

	async createRoom(owner_id: string): Promise<Room> {
		const room = new Room(uuidv4(), owner_id, []);
		await this.roomRepository.save(room);
		return room;
	}

	async getRoomById(roomid: string): Promise<Room | null> {
		// roomIdの検証を追加
		if (roomid !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomid}`,
			);
		}
		return this.roomRepository.findById(roomid);
	}

	async startRoom(roomid: string, userid: UserId): Promise<boolean> {
		// roomIdの検証を追加
		if (roomid !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomid}`,
			);
		}
		console.log("RoomService.startRoom has called: ", roomid, userid);
		const room = await this.roomRepository.findById(roomid);
		if (room === null) return false;
		if (room.ownerId === userid) this.roomRepository.start(roomid);

		const participants: UserId[] = room.allParticipants.map((p) => p.id);
		console.log("participants: ", participants);

		// 参加者が4人未満の場合はトーナメントを開始しない
		if (participants.length < 4) {
			console.log("Cannot start tournament: insufficient participants");
			console.warn(
				`Cannot start tournament: insufficient participants (${participants.length}/4) for room ${roomid}`,
			);
			return false;
		}

		const ownerid: UserId = room.ownerId;
		console.log("room.started event emitted");
		globalEventEmitter.emit("room.started", roomid, participants, ownerid);
		return true;
	}

	async deleteRoom(roomid: string, userid: UserId): Promise<boolean> {
		// roomIdの検証を追加
		if (roomid !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomid}`,
			);
		}
		const room = await this.roomRepository.findById(roomid);
		if (room === null) return false;
		if (room.ownerId === userid && room.status === "waiting")
			return this.roomRepository.delete(roomid);
		return false;
	}

	async checkOwner(id: string, userid: UserId): Promise<boolean> {
		// roomIdの検証を追加
		if (id !== this.roomId) {
			throw new Error(`Room ID mismatch: expected ${this.roomId}, got ${id}`);
		}
		const room = await this.roomRepository.findById(id);
		if (room === null) throw Error("no room found");
		return room.ownerId === userid;
	}
}

export class RoomUserService {
	private readonly userRepository: UserRepository;
	private readonly roomRepository: RoomRepository;
	private readonly roomId: RoomId;

	// シングルトンインスタンスを管理するMap
	private static instances: Map<RoomId, RoomUserService> = new Map();

	constructor(roomId: RoomId) {
		this.roomId = roomId;
		const u_repository = new TypeOrmUserRepository(
			AppDataSource.getRepository("UserEntity"),
		);
		const r_repository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
		this.userRepository = u_repository;
		this.roomRepository = r_repository;
	}

	// room idでシングルトンインスタンスを取得
	public static getInstance(roomId: RoomId): RoomUserService {
		if (!RoomUserService.instances.has(roomId)) {
			RoomUserService.instances.set(roomId, new RoomUserService(roomId));
		}
		return RoomUserService.instances.get(roomId)!;
	}

	// インスタンスを削除（roomが削除された時など）
	public static removeInstance(roomId: RoomId): void {
		RoomUserService.instances.delete(roomId);
	}

	async joinRoom(userid: UserId, roomid: RoomId): Promise<boolean> {
		// roomIdの検証を追加
		if (roomid !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomid}`,
			);
		}
		const user = await this.userRepository.findById(userid);
		if (!user) throw Error("no user found");
		const room = await this.roomRepository.findById(roomid);
		if (!room) throw Error("no room found");

		// 既に参加しているかチェック
		const participants = await this.roomRepository.findParticipants(roomid);
		const isAlreadyParticipant = participants.some((p) => p.id === userid);
		if (isAlreadyParticipant) {
			console.log(`User ${userid} is already in room ${roomid}`);
			return true; // 既に参加済みの場合は成功として扱う
		}

		// 新規参加の場合のみ満員チェック
		if (room.isFull()) throw Error("the room is full");

		participants.push(user);
		return this.roomRepository.storeParticipants(roomid, participants);
	}

	async leaveRoom(userid: UserId): Promise<boolean> {
		const user = await this.userRepository.findById(userid);
		if (!user) throw Error("no user found");
		const roomid = user._room_id;
		if (!roomid) throw Error("user not in room");
		const room = await this.roomRepository.findById(roomid);
		if (!room) throw Error("no roon found");
		if (room.isEmpty()) throw Error("no one is in the room");

		// Ownerの場合は、ルームの状態を確認してから離脱を許可するかどうかを決める
		if (room.checkOwner(userid)) {
			// ルームが待機状態の場合は、ownerの一時的な離脱を許可
			if (room.status === "waiting") {
				console.log(
					`Owner ${userid} temporarily leaving room ${roomid} (status: ${room.status})`,
				);
				const newParticipants = room.allParticipants.filter(
					(p) => p.id !== userid,
				);
				return this.roomRepository.storeParticipants(roomid, newParticipants);
			} else if (room.status === "playing") {
				// ルームが進行中の場合は、ownerも他のプレイヤーと同列に扱う
				console.log(
					`Owner ${userid} leaving room ${roomid} during ongoing game (status: ${room.status})`,
				);
				const newParticipants = room.allParticipants.filter(
					(p) => p.id !== userid,
				);
				return this.roomRepository.storeParticipants(roomid, newParticipants);
			} else {
				// ルームが終了状態の場合は、ownerの離脱を拒否
				throw Error("owner cannot leave room that is finished");
			}
		}

		const newParticipants = room.allParticipants.filter((p) => p.id !== userid);
		return this.roomRepository.storeParticipants(roomid, newParticipants);
	}

	async getAllRoomUsers(id: string): Promise<RoomUser[]> {
		// roomIdの検証を追加
		if (id !== this.roomId) {
			throw new Error(`Room ID mismatch: expected ${this.roomId}, got ${id}`);
		}
		return (await this.roomRepository.findParticipants(id)).map((p) =>
			this.extractRoomUser(p),
		);
	}

	private extractRoomUser(user: User): RoomUser {
		const room_user: RoomUser = {
			id: user.id,
			name: user.username,
			avatar: user.avatar,
			num_win: 0,
			num_lose: 0,
		};
		return room_user;
	}
}
