import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('support/tickets')
@RequireModule('customer_service')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @RequirePermissions('support.tickets.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('support.tickets.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTicketsQueryDto) {
    if (query.page) return this.ticketsService.findPaginated(user.tenantId, query);
    return this.ticketsService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('support.tickets.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('support.tickets.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/assign')
  @RequirePermissions('support.tickets.write')
  assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.ticketsService.assign(user.tenantId, id, dto.assigneeUserId);
  }

  @Patch(':id/escalate')
  @RequirePermissions('support.tickets.write')
  escalate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.escalate(user.tenantId, id);
  }

  @Patch(':id/status')
  @RequirePermissions('support.tickets.write')
  updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(user.tenantId, id, dto.status);
  }

  @Post(':id/comments')
  @RequirePermissions('support.tickets.write')
  addComment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateTicketCommentDto) {
    return this.ticketsService.addComment(user.tenantId, id, user.userId, dto);
  }

  @Get(':id/comments')
  @RequirePermissions('support.tickets.read')
  findComments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.findComments(user.tenantId, id, true);
  }
}
