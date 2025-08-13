import { DataSource } from 'typeorm';
import { UserEntity } from '@infrastructure/entity/users/UserEntity.js';
import { RoomEntity } from '@infrastructure/entity/rooms/RoomEntity.js';

export const AppDataSource = new DataSource({
  type: 'sqlite', // SQLiteデータベースを使用
  database: './database.sqlite', // プロジェクトルートに生成
  entities: [UserEntity, RoomEntity], // すべてのエンティティを登録
  synchronize: true, // 開発時：エンティティに基づくテーブルを自動作成
  logging: true, // デバッグ用にSQLログを出力
});