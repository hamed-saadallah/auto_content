import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureAdmin();
  }

  async ensureAdmin() {
    const email = (this.config.get<string>('ADMIN_EMAIL') || 'admin@example.com').toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!password) {
      this.logger.warn('ADMIN_PASSWORD is not set — login will fail until it is configured');
      return;
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return;
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.create({ data: { email, passwordHash } });
    this.logger.log(`Seeded single user ${email}`);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }
}
