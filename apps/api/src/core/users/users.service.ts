import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignUserOrgDto } from '../org/dto/assign-user-org.dto';
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

  findOneForTenant(tenantId: string, id: string): Promise<User | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  /** The direct manager of a user, per the org-structure reporting
   * hierarchy — null if the user has none assigned. Used to escalate
   * notifications one level up, not the whole chain. */
  async findManagerOf(tenantId: string, userId: string): Promise<User | null> {
    const user = await this.repo.findOne({ where: { tenantId, id: userId } });
    if (!user?.managerId) return null;
    return this.repo.findOne({ where: { tenantId, id: user.managerId } });
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

  /** Places a user in the org structure — manager, branch, department,
   * position. Only the fields present in the DTO are touched. */
  async assignOrg(tenantId: string, userId: string, dto: AssignUserOrgDto): Promise<User> {
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException(`Usuario ${userId} no encontrado`);

    if (dto.managerId !== undefined) {
      if (dto.managerId === userId) {
        throw new BadRequestException('Un usuario no puede ser su propio líder');
      }
      if (dto.managerId) {
        const manager = await this.repo.findOne({ where: { id: dto.managerId, tenantId } });
        if (!manager) throw new BadRequestException('El líder asignado no existe en esta empresa');
        if (await this.wouldCreateCycle(tenantId, userId, dto.managerId)) {
          throw new BadRequestException('Esa asignación crearía un ciclo en la jerarquía de reporte');
        }
      }
      user.managerId = dto.managerId ?? null;
    }
    if (dto.branchId !== undefined) user.branchId = dto.branchId ?? null;
    if (dto.departmentId !== undefined) user.departmentId = dto.departmentId ?? null;
    if (dto.positionId !== undefined) user.positionId = dto.positionId ?? null;

    return this.repo.save(user);
  }

  /** Walks up from the candidate manager's own chain — if it ever reaches
   * `userId`, assigning that manager would close a loop. */
  private async wouldCreateCycle(tenantId: string, userId: string, managerId: string): Promise<boolean> {
    let currentId: string | null = managerId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === userId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      const current: User | null = await this.repo.findOne({ where: { id: currentId, tenantId } });
      currentId = current?.managerId ?? null;
    }
    return false;
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
