import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { DraftDto, DraftType } from './dto/draft.dto';
import { SummarizeDto, SummaryType } from './dto/summarize.dto';
import { LeadScoreDto } from './dto/lead-score.dto';
import { AssistantDto } from './dto/assistant.dto';
import { QuotesService } from '../crm/quotes/quotes.service';
import { TicketsService } from '../support/tickets/tickets.service';
import { ProductsService } from '../inventory/products/products.service';
import { CompaniesService } from '../crm/companies/companies.service';
import { OpportunitiesService } from '../crm/opportunities/opportunities.service';
import { PipelineStagesService } from '../crm/pipeline-stages/pipeline-stages.service';
import { LeadsService } from '../crm/leads/leads.service';
import { QuoteFollowUpsService } from '../crm/quotes/quote-follow-ups.service';
import { ActivitiesService } from '../crm/activities/activities.service';
import { QuoteFollowUpStatus } from '../crm/quotes/entities/quote-follow-up.entity';
import { TicketStatus } from '../support/tickets/entities/ticket.entity';
import { OpportunityStatus } from '../crm/opportunities/entities/opportunity.entity';
import { LeadPriority } from '../crm/leads/entities/lead.entity';

const LANGUAGE_NOTE = 'Responde siempre en español, en un tono profesional y cercano, sin encabezados de correo (sin "Asunto:" ni firma).';

function stripJsonFences(text: string): string {
  return text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
}

@Injectable()
export class AiService {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly quotesService: QuotesService,
    private readonly ticketsService: TicketsService,
    private readonly productsService: ProductsService,
    private readonly companiesService: CompaniesService,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly pipelineStagesService: PipelineStagesService,
    private readonly leadsService: LeadsService,
    private readonly quoteFollowUpsService: QuoteFollowUpsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async draft(tenantId: string, dto: DraftDto): Promise<{ draft: string }> {
    let prompt: string;

    if (dto.type === DraftType.QUOTE_FOLLOWUP) {
      const quote = await this.quotesService.findOneForTenant(tenantId, dto.contextId);
      const company = await this.companiesService.findOneForTenant(tenantId, quote.companyId);
      const items = quote.items.map((i) => `- ${i.description} (x${i.quantity}): ${i.total}`).join('\n');
      prompt = `Eres un vendedor redactando un mensaje de seguimiento para una cotización.
Cliente: ${company.name}
Cotización ${quote.quoteNumber}, estado: ${quote.status}, total: ${quote.total} ${quote.currencyCode}
Ítems:
${items}

Redacta un mensaje breve y cordial de seguimiento, preguntando si tienen dudas o si desean avanzar. ${LANGUAGE_NOTE}`;
    } else if (dto.type === DraftType.TICKET_REPLY) {
      const ticket = await this.ticketsService.findOneForTenant(tenantId, dto.contextId);
      prompt = `Eres un agente de servicio al cliente redactando una respuesta a un ticket de soporte.
Asunto: ${ticket.subject}
Descripción del cliente: ${ticket.description}
Prioridad: ${ticket.priority}, estado: ${ticket.status}

Redacta una respuesta breve, empática y útil para el cliente. ${LANGUAGE_NOTE}`;
    } else {
      const product = await this.productsService.findOneForTenant(tenantId, dto.contextId);
      prompt = `Eres un redactor de catálogo de productos.
Producto: ${product.name} (SKU ${product.sku})

Redacta una descripción de producto breve y atractiva para un catálogo comercial. ${LANGUAGE_NOTE}`;
    }

    if (dto.instructions) {
      prompt += `\n\nInstrucciones adicionales del usuario: ${dto.instructions}`;
    }

    const text = await this.aiProvider.complete(prompt);
    return { draft: text.trim() };
  }

  async summarize(tenantId: string, dto: SummarizeDto): Promise<{ summary: string }> {
    let prompt: string;

    if (dto.type === SummaryType.COMPANY) {
      const company = await this.companiesService.findOneForTenant(tenantId, dto.contextId as string);
      const opportunities = await this.opportunitiesService.findAllForTenant(tenantId, { companyId: company.id });
      const quotes = await this.quotesService.findAllForTenant(tenantId, { companyId: company.id });
      const openCount = opportunities.filter((o) => o.status === OpportunityStatus.OPEN).length;
      const wonCount = opportunities.filter((o) => o.status === OpportunityStatus.WON).length;
      const lostCount = opportunities.filter((o) => o.status === OpportunityStatus.LOST).length;
      const totalOpenValue = opportunities.filter((o) => o.status === OpportunityStatus.OPEN).reduce((sum, o) => sum + Number(o.value), 0);

      prompt = `Eres un asistente comercial resumiendo la relación con un cliente.
Empresa: ${company.name} (industria: ${company.industry ?? 'sin especificar'})
Oportunidades: ${openCount} abiertas (valor total ${totalOpenValue}), ${wonCount} ganadas, ${lostCount} perdidas
Cotizaciones enviadas: ${quotes.length}

Redacta un resumen ejecutivo breve (máximo 4 líneas) del estado de la relación comercial con este cliente, destacando riesgos u oportunidades. ${LANGUAGE_NOTE}`;
    } else {
      const opportunities = await this.opportunitiesService.findAllForTenant(tenantId, { status: OpportunityStatus.OPEN });
      const stages = await this.pipelineStagesService.findAllForTenant(tenantId);
      const byStage = stages
        .map((stage) => {
          const inStage = opportunities.filter((o) => o.stageId === stage.id);
          const value = inStage.reduce((sum, o) => sum + Number(o.value), 0);
          return `- ${stage.name}: ${inStage.length} oportunidades, valor ${value}`;
        })
        .join('\n');

      prompt = `Eres un asistente comercial resumiendo el estado del pipeline de ventas.
Etapas del pipeline:
${byStage}

Redacta un resumen ejecutivo breve (máximo 5 líneas) del estado del pipeline, destacando dónde está concentrado el valor y cualquier cuello de botella evidente. ${LANGUAGE_NOTE}`;
    }

    const text = await this.aiProvider.complete(prompt);
    return { summary: text.trim() };
  }

  /** Doesn't persist anything on the Lead — this is a suggestion the user
   * reads and, if they agree, applies manually by editing the lead's
   * priority themselves. Adding a stored AI-priority field/migration was
   * more than this feature needs to be useful. */
  async scoreLead(tenantId: string, dto: LeadScoreDto): Promise<{ leadId: string; priority: string; reasoning: string }> {
    const lead = await this.leadsService.findOneForTenant(tenantId, dto.leadId);
    const prompt = `Eres un asistente de calificación de leads comerciales.
Lead: ${lead.name}
Fuente: ${lead.source ?? 'sin especificar'}
Interés: ${lead.interest ?? 'sin especificar'}
Presupuesto estimado: ${lead.estimatedBudget ?? 'sin especificar'}
Estado actual: ${lead.status}

Evalúa qué tan prioritario es este lead y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma exacta:
{"priority": "low" | "medium" | "high", "reasoning": "una oración breve explicando por qué, en español"}`;

    const text = await this.aiProvider.complete(prompt);
    let parsed: { priority?: string; reasoning?: string };
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch {
      throw new ServiceUnavailableException('La IA devolvió una respuesta que no se pudo interpretar');
    }
    if (!parsed.priority || !Object.values(LeadPriority).includes(parsed.priority as LeadPriority)) {
      throw new ServiceUnavailableException('La IA devolvió una prioridad inválida');
    }

    return { leadId: lead.id, priority: parsed.priority, reasoning: parsed.reasoning ?? '' };
  }

  /** No conversation memory across calls, and no arbitrary database
   * access — the model only sees this aggregate snapshot, so it can't
   * answer questions that need a specific record it wasn't given
   * ("¿cuál es el teléfono de Juan Pérez?"). A real assistant would need
   * retrieval/tool-use over the tenant's data; this is a fixed context
   * window instead, the same manageable-scope trade-off made everywhere
   * else in this project. */
  async assistant(tenantId: string, dto: AssistantDto): Promise<{ answer: string }> {
    const [leads, pendingFollowUps, tickets, activities] = await Promise.all([
      this.leadsService.findAllForTenant(tenantId),
      this.quoteFollowUpsService.findAllForTenant(tenantId, { status: QuoteFollowUpStatus.PENDING }),
      this.ticketsService.findAllForTenant(tenantId),
      this.activitiesService.findAllForTenant(tenantId),
    ]);

    const openTickets = tickets.filter((t) => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingActivities = activities.filter(
      (a) => !a.completedAt && a.scheduledAt && new Date(a.scheduledAt) >= now && new Date(a.scheduledAt) <= weekFromNow,
    );

    const leadsByStatus = Object.entries(
      leads.reduce<Record<string, number>>((acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ');

    const ticketsByPriority = Object.entries(
      openTickets.reduce<Record<string, number>>((acc, t) => {
        acc[t.priority] = (acc[t.priority] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([priority, count]) => `${priority}: ${count}`)
      .join(', ');

    const context = `Resumen de datos de la empresa (al ${now.toISOString().slice(0, 10)}):
- Leads por estado: ${leadsByStatus || 'sin leads'}
- Seguimientos de cotizaciones pendientes: ${pendingFollowUps.length}
- Tickets de soporte abiertos por prioridad: ${ticketsByPriority || 'ninguno'}
- Actividades comerciales programadas para los próximos 7 días: ${upcomingActivities.length}`;

    const prompt = `Eres un asistente interno que responde preguntas sobre el negocio usando SOLO el siguiente resumen de datos — no inventes cifras ni nombres que no estén aquí. Si la pregunta no se puede responder con esta información, dilo claramente y sugiere dónde revisar en el sistema.

${context}

Pregunta del usuario: ${dto.question}

${LANGUAGE_NOTE}`;

    const text = await this.aiProvider.complete(prompt);
    return { answer: text.trim() };
  }
}
