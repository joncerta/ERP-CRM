import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin SMTP wrapper. Without SMTP_HOST configured it just logs and no-ops —
 * this keeps local dev and CI from needing real mail credentials, at the
 * cost of "sending" being silently skipped until someone sets the env vars.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    this.from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@erp-crm.local';

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
          secure: this.config.get<string>('SMTP_SECURE') === 'true',
          auth: this.config.get<string>('SMTP_USER')
            ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASS') }
            : undefined,
        })
      : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`SMTP_HOST no configurado — se omite el envío de correo a ${input.to}: "${input.subject}"`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, to: input.to, subject: input.subject, html: input.html });
  }
}
