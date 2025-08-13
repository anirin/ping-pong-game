import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { type RoomMode, type RoomStatus, type RoomType } from '@domain/model/rooms/value-objects.js';

@Entity('Room')
export class RoomEntity {
  @PrimaryColumn('text')
  id!: string;

  @ManyToMany('text')
  owner_id!: string;

  @Column('text', { default: 'waiting' })
  status!: RoomStatus;

  @Column('text', { default: 'online'})
  mode!: RoomMode;

  @Column('text', { default: '1on1' })
  room_type!: RoomType;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}