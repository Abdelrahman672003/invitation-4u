import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

/** Development adapter: prints emails to the API console instead of sending them. */
class ConsoleEmailService implements EmailService {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage) {
    this.sent.push(message);
    logger.info(`Email (console adapter) from ${env.EMAIL_FROM}`, { ...message });
  }
}

// Swap in a real provider (SES, Postmark, Mailgun…) by implementing EmailService.
export const emailService = new ConsoleEmailService();
