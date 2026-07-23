import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

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

  async findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<User>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 200);
    const sortable = ['fullName', 'email', 'isActive', 'createdAt'];
    const sortBy = sortable.includes(query.sortBy ?? '') ? (query.sortBy as string) : 'fullName';

    const qb = this.repo.createQueryBuilder('user').where('user.tenantId = :tenantId', { tenantId });
    if (query.search) {
      const search = `%${query.search}%`;
      qb.andWhere(
        new Brackets((sub) => sub.where('user.fullName ILIKE :search', { search }).orWhere('user.email ILIKE :search', { search })),
      );
    }
    qb.orderBy(`user.${sortBy}`, query.sortDir === 'DESC' ? 'DESC' : 'ASC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
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

  /** Returns null (not an error) for an unknown/inactive user — callers must
   * respond identically either way so the endpoint can't be used to probe
   * which emails exist. */
  async requestPasswordReset(tenantId: string, email: string): Promise<{ user: User; token: string } | null> {
    const user = await this.repo.findOne({ where: { tenantId, email } });
    if (!user || !user.isActive) return null;

    const token = randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.repo.save(user);
    return { user, token };
  }

  async resetPassword(token: string, newPassword: string): Promise<User> {
    const user = await this.repo.findOne({
      where: { passwordResetToken: token, passwordResetExpiresAt: MoreThan(new Date()) },
    });
    if (!user) throw new BadRequestException('El enlace para restablecer la contraseña es inválido o expiró');

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    return this.repo.save(user);
  }

  async changeOwnPassword(tenantId: string, userId: string, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException(`Usuario ${userId} no encontrado`);

    const matches = await UsersService.verifyPassword(currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedException('La contraseña actual no es correcta');

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return this.repo.save(user);
  }
}
