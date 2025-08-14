import { RoomEntity } from "@infrastructure/entity/rooms/RoomEntity.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
	type: "sqlite", // SQLiteデータベースを使用
	database: "./database.sqlite", // プロジェクトルートに生成
	entities: [UserEntity, RoomEntity], // すべてのエンティティを登録
	synchronize: true, // 開発時：エンティティに基づくテーブルを自動作成
	logging: true, // デバッグ用にSQLログを出力
});
