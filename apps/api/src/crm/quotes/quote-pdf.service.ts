import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Quote } from './entities/quote.entity';
import { Company } from '../companies/entities/company.entity';

const PAGE_LEFT = 50;
const PAGE_RIGHT = 550;

@Injectable()
export class QuotePdfService {
  constructor(@InjectRepository(Company) private readonly companiesRepo: Repository<Company>) {}

  async generate(quote: Quote): Promise<Buffer> {
    const company = quote.companyId ? await this.companiesRepo.findOne({ where: { id: quote.companyId } }) : null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(`Cotización ${quote.quoteNumber}`);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666');
      doc.text(`Empresa: ${company?.name ?? '—'}`);
      if (quote.validUntil) doc.text(`Válida hasta: ${quote.validUntil}`);
      doc.moveDown(1);

      doc.fillColor('#000').fontSize(11);
      let y = doc.y;
      doc.text('Descripción', PAGE_LEFT, y, { width: 250 });
      doc.text('Cant.', PAGE_LEFT + 250, y, { width: 60, align: 'right' });
      doc.text('Precio unit.', PAGE_LEFT + 310, y, { width: 90, align: 'right' });
      doc.text('Total', PAGE_LEFT + 400, y, { width: 100, align: 'right' });
      doc.moveDown(0.4);
      doc.moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_RIGHT, doc.y).stroke();
      doc.moveDown(0.3);

      doc.fontSize(10);
      for (const item of quote.items) {
        y = doc.y;
        doc.text(item.description, PAGE_LEFT, y, { width: 250 });
        doc.text(String(item.quantity), PAGE_LEFT + 250, y, { width: 60, align: 'right' });
        doc.text(Number(item.unitPrice).toLocaleString(), PAGE_LEFT + 310, y, { width: 90, align: 'right' });
        doc.text(Number(item.total).toLocaleString(), PAGE_LEFT + 400, y, { width: 100, align: 'right' });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.3);
      doc.moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_RIGHT, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).text(`Subtotal: ${quote.currencyCode} ${Number(quote.subtotal).toLocaleString()}`, { align: 'right' });
      doc.text(`Impuesto: ${quote.currencyCode} ${Number(quote.tax).toLocaleString()}`, { align: 'right' });
      doc.fontSize(13).text(`Total: ${quote.currencyCode} ${Number(quote.total).toLocaleString()}`, { align: 'right' });

      doc.end();
    });
  }
}
