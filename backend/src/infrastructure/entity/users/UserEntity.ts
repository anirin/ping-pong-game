import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { type UserStatus } from '@domain/model/users/value-objects.js';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  username!: string;

  @Column('text', { nullable: true })
  avatar_url!: string | null;

  @Column('text', { default: 'offline' })
  status!: UserStatus;

  @Column('text')
  password_hash!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}