import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeArticle } from './entities/knowledge-article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

@Injectable()
export class KnowledgeService extends TenantScopedService<KnowledgeArticle> {
  constructor(@InjectRepository(KnowledgeArticle) repo: Repository<KnowledgeArticle>) {
    super(repo);
  }

  findPaginated(tenantId: string, query: ListQueryDto): Promise<Paginated<KnowledgeArticle>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'article',
      searchColumns: ['title', 'content', 'category'],
      sortableColumns: ['title', 'category', 'viewCount', 'createdAt'],
      defaultSortBy: 'createdAt',
    });
  }

  private async uniqueSlug(tenantId: string, title: string): Promise<string> {
    const base = slugify(title) || 'articulo';
    let candidate = base;
    let suffix = 2;
    while (await this.repository.findOne({ where: { tenantId, slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(tenantId: string, userId: string, dto: CreateArticleDto): Promise<KnowledgeArticle> {
    const article = this.repository.create({
      tenantId,
      title: dto.title,
      slug: await this.uniqueSlug(tenantId, dto.title),
      content: dto.content,
      category: dto.category ?? null,
      isPublished: dto.isPublished ?? false,
      viewCount: 0,
      createdByUserId: userId,
    });
    return this.repository.save(article);
  }

  async update(tenantId: string, id: string, dto: UpdateArticleDto): Promise<KnowledgeArticle> {
    const article = await this.findOneForTenant(tenantId, id);
    if (dto.title !== undefined && dto.title !== article.title) {
      article.title = dto.title;
      article.slug = await this.uniqueSlug(tenantId, dto.title);
    }
    if (dto.content !== undefined) article.content = dto.content;
    if (dto.category !== undefined) article.category = dto.category;
    if (dto.isPublished !== undefined) article.isPublished = dto.isPublished;
    return this.repository.save(article);
  }

  /** The "chatbot": no NLP, just ranks published articles by how many of
   * the query's words show up in the title or content. Good enough to
   * point an agent (or a future public widget) at the most relevant
   * article — real intent understanding would need an LLM integration,
   * out of scope here. */
  async suggestArticles(tenantId: string, query: string, limit = 5): Promise<KnowledgeArticle[]> {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter((w) => w.length > 2);
    if (!words.length) return [];

    const articles = await this.repository.find({ where: { tenantId, isPublished: true } });
    const scored = articles
      .map((article) => {
        const haystack = `${article.title} ${article.content}`.toLowerCase();
        const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
        return { article, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.article);
  }

  async recordView(tenantId: string, id: string): Promise<KnowledgeArticle> {
    const article = await this.findOneForTenant(tenantId, id);
    article.viewCount += 1;
    return this.repository.save(article);
  }
}
