import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async notify(
    tenantId: string,
    userId: string,
    type: string,
    title: string,
    message: string,
    link: string | null = null,
  ): Promise<Notification> {
    const notification = await this.repo.save(
      this.repo.create({ tenantId, userId, type, title, message, link }),
    );
    this.gateway.pushToUser(tenantId, userId, notification);
    return notification;
  }

  findForUser(tenantId: string, userId: string): Promise<Notification[]> {
    return this.repo.find({ where: { tenantId, userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<void> {
    await this.repo.update({ id, tenantId, userId }, { isRead: true });
  }

  async markAllRead(tenantId: string, userId: string): Promise<void> {
    await this.repo.update({ tenantId, userId, isRead: false }, { isRead: true });
  }
}
