import { Module } from '@nestjs/common';
import { MistralService } from './mistral.service';
import { InternalLinkingService } from './internal-linking.service';

@Module({
  providers: [MistralService, InternalLinkingService],
  exports: [MistralService, InternalLinkingService],
})
export class GenerationModule {}
