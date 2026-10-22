import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  rootDir(): string {
    return this.config.get<string>('UPLOAD_DIR') || join(process.cwd(), 'data', 'uploads');
  }

  ensureRoot() {
    const dir = this.rootDir();
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  publicUrl(relPath: string): string {
    return `/uploads/${relPath.replace(/^\/+/, '')}`;
  }

  absolutePath(relPath: string): string {
    return join(this.rootDir(), relPath);
  }

  exists(relPath?: string | null): boolean {
    if (!relPath) return false;
    return existsSync(this.absolutePath(relPath));
  }

  saveCover(contentId: string, bytes: Buffer, extension = '.png'): string {
    this.ensureRoot();
    const relPath = `${contentId}/cover${extension}`;
    const abs = this.absolutePath(relPath);
    mkdirSync(join(this.rootDir(), contentId), { recursive: true });
    writeFileSync(abs, bytes);
    return relPath;
  }
}
