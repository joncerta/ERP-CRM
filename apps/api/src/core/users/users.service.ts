import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({ where: { tenantId, email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo en esta empresa');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.repo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      roleId: dto.roleId,
      preferredLocale: dto.preferredLocale ?? 'es',
    });
    return this.repo.save(user);
  }

  findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.repo.findOne({ where: { tenantId, email }, relations: { role: true } });
  }

  findAllForTenant(tenantId: string): Promise<User[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async setActive(tenantId: string, userId: string, isActive: boolean): Promise<User> {
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException(`Usuario ${userId} no encontrado`);
    user.isActive = isActive;
    return this.repo.save(user);
  }

  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
