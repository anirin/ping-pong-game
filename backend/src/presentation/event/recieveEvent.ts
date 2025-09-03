// 発火したイベントの受信のみを行う （ event の発火は application layer でのみ行う）
import { globalEventEmitter } from "./globalEventEmitter.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";

globalEventEmitter.on("room_started", (roomId: RoomId) => {
	console.log(`room ${roomId} started`);
});

globalEventEmitter.on("room_deleted", (roomId: RoomId) => {
	console.log(`room ${roomId} deleted`);
});
