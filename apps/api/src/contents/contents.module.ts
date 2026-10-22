import { Module } from '@nestjs/common';
import { GenerationModule } from '../generation/generation.module';
import { StorageModule } from '../storage/storage.module';
import { LinkedInPublisherService } from '../linkedin/linkedin-publisher.service';
import { WordpressPublisherService } from '../wordpress/wordpress-publisher.service';
import { ContentsController } from './contents.controller';
import { ContentsService } from './contents.service';
import { PublishService } from './publish.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [GenerationModule, StorageModule],
  controllers: [ContentsController, IntegrationsController],
  providers: [ContentsService, PublishService, LinkedInPublisherService, WordpressPublisherService],
})
export class ContentsModule {}
