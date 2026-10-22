import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MistralService } from '../generation/mistral.service';
import { LinkedInPublisherService } from '../linkedin/linkedin-publisher.service';
import { WordpressPublisherService } from '../wordpress/wordpress-publisher.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly mistral: MistralService,
    private readonly linkedin: LinkedInPublisherService,
    private readonly wordpress: WordpressPublisherService,
  ) {}

  @Get('status')
  status() {
    return {
      mistral: this.mistral.isConfigured(),
      linkedin: this.linkedin.isConfigured(),
      wordpress: this.wordpress.isConfigured(),
    };
  }
}
