import { ContentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength, IsArray, IsUUID } from 'class-validator';

export class CreateContentDto {
  @IsEnum(ContentType)
  type!: ContentType;

  @IsString()
  @MinLength(3)
  sujet!: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  objectif?: string;

  @IsOptional()
  @IsBoolean()
  generate?: boolean;
}

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  sujet?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  objectif?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  focusKeyword?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;
}

export class ReviseContentDto {
  @IsString()
  @MinLength(2)
  instruction!: string;
}

export class SelectInternalLinksDto {
  @IsArray()
  @IsUUID('4', { each: true })
  selectedLinkIds!: string[];
}

