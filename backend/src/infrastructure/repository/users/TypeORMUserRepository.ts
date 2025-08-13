import { Repository } from 'typeorm';
import { User } from '@domain/model/users/User.js';
import { type UserId, Username, AvatarUrl, type UserStatus } from '@domain/model/users/value-objects.js';
import { type UserRepository } from '@domain/repository/users/UserRepository.js';
import { UserEntity } from '@infrastructure/entity/users/UserEntity.js';

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly repository: Repository<UserEntity>) {}

  async findById(id: UserId): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByUsername(username: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { username } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async save(user: User): Promise<void> {
    const entity = this.toEntity(user);
    await this.repository.save(entity);
  }

  async delete(id: UserId): Promise<void> {
    await this.repository.delete(id);
  }

  async findAll(): Promise<User[]> {
    const entities = await this.repository.find();
    return entities.map((entity) => this.toDomain(entity));
  }

  private toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      new Username(entity.username),
      entity.password_hash,
      entity.status as UserStatus,
      entity.created_at,
      entity.avatar_url ? new AvatarUrl(entity.avatar_url) : null,
    );
  }

  private toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.username = user.username.value;
    entity.avatar_url = user.avatar?.value ?? null;
    entity.status = user.status;
    entity.password_hash = user['passwordHash'] ?? ''; // 仮のパスワードハッシュ
    entity.created_at = user.createdAt;
    entity.updated_at = new Date();
    return entity;
  }
}