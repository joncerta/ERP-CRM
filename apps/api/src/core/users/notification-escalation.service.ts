import { Injectable } from '@nestjs/common';
import { UsersService } from './users.service';
import { NotificationsService } from '../../notifications/notifications.service';

/** Wraps NotificationsService.notify() so a business event can also reach
 * the acting user's direct manager (one level up, not the whole reporting
 * chain — mirrors what a coordinator actually wants: "someone on my team
 * did X", not every notification for every descendant). Lives in
 * UsersModule (not NotificationsModule) because NotificationsModule is
 * kept a dependency-free leaf — SessionsModule needs it, and UsersModule
 * already depends on SessionsModule, so importing UsersModule back into
 * NotificationsModule would create a cycle. */
@Injectable()
export class NotificationEscalationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyWithEscalation(
    tenantId: string,
    actorUserId: string,
    type: string,
    title: string,
    message: string,
    link: string | null = null,
  ): Promise<void> {
    await this.notificationsService.notify(tenantId, actorUserId, type, title, message, link);

    const manager = await this.usersService.findManagerOf(tenantId, actorUserId);
    if (!manager) return;

    const actor = await this.usersService.findOneForTenant(tenantId, actorUserId);
    const escalatedMessage = actor ? `${actor.fullName}: ${message}` : message;
    await this.notificationsService.notify(tenantId, manager.id, `${type}.escalated`, title, escalatedMessage, link);
  }
}
