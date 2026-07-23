import { Repository } from 'typeorm';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeArticle } from './entities/knowledge-article.entity';

function buildService() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'article-1', ...data })),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<Repository<KnowledgeArticle>>;
  const service = new KnowledgeService(repo);
  return { service, repo };
}

describe('KnowledgeService', () => {
  describe('create', () => {
    it('slugifies the title, stripping accents and punctuation', async () => {
      const { service } = buildService();

      const article = await service.create('tenant-a', 'user-1', {
        title: '¿Cómo restablezco mi contraseña?',
        content: 'Pasos...',
      });

      expect(article.slug).toBe('como-restablezco-mi-contrasena');
    });

    it('appends a numeric suffix when the slug is already taken', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValueOnce({ id: 'existing' } as KnowledgeArticle).mockResolvedValueOnce(null);

      const article = await service.create('tenant-a', 'user-1', { title: 'Envíos', content: 'Pasos...' });

      expect(article.slug).toBe('envios-2');
    });
  });

  describe('suggestArticles', () => {
    it('ranks published articles by how many query words they contain', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([
        { id: 'a1', title: 'Cómo restablecer tu contraseña', content: 'Ve a configuración y...', isPublished: true } as KnowledgeArticle,
        { id: 'a2', title: 'Política de envíos', content: 'Los envíos tardan...', isPublished: true } as KnowledgeArticle,
      ]);

      const results = await service.suggestArticles('tenant-a', 'no puedo restablecer mi contraseña');

      expect(results.map((a) => a.id)).toEqual(['a1']);
    });

    it('returns nothing for a query with no meaningful words', async () => {
      const { service } = buildService();

      const results = await service.suggestArticles('tenant-a', 'de la y');

      expect(results).toEqual([]);
    });
  });
});
