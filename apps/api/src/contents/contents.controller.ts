import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ContentType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentsService } from './contents.service';
import { PublishService } from './publish.service';
import { CreateContentDto, ReviseContentDto, UpdateContentDto, SelectInternalLinksDto } from './dto/content.dto';
import { PublishContentDto } from './dto/publish.dto';

@Controller('contents')
@UseGuards(JwtAuthGuard)
export class ContentsController {
  constructor(
    private readonly contents: ContentsService,
    private readonly publish: PublishService,
  ) {}

  @Get()
  list(@Query('type') type?: ContentType) {
    return this.contents.list(type);
  }

  @Post()
  create(@Body() dto: CreateContentDto) {
    return this.contents.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.contents.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contents.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contents.remove(id);
  }

  @Post(':id/generate')
  generate(@Param('id') id: string) {
    return this.contents.generate(id);
  }

  @Post(':id/revise')
  revise(@Param('id') id: string, @Body() dto: ReviseContentDto) {
    return this.contents.revise(id, dto.instruction);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.contents.approve(id);
  }

  @Post(':id/publish')
  publishContent(@Param('id') id: string, @Body() dto: PublishContentDto) {
    return this.publish.publish(id, dto);
  }

  @Post(':id/suggest-internal-links')
  suggestInternalLinks(@Param('id') id: string) {
    return this.contents.suggestInternalLinks(id);
  }

  @Post(':id/select-internal-links')
  selectInternalLinks(
    @Param('id') id: string,
    @Body() dto: SelectInternalLinksDto,
  ) {
    return this.contents.selectInternalLinks(id, dto.selectedLinkIds);
  }
}
