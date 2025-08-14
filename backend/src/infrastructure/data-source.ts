// src/infrastructure/data-source.ts
import { DataSource } from 'typeorm';
import { UserEntity } from './entity/users/UserEntity.js';
import { RoomEntity } from './entity/rooms/RoomEntity.js';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './database.sqlite',
  entities: [UserEntity, RoomEntity],
  synchronize: true,
  logging: true,
});
