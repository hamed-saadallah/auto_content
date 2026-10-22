import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PublishChannel } from '@prisma/client';

export class PublishContentDto {
  @IsEnum(PublishChannel)
  channel!: PublishChannel;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
