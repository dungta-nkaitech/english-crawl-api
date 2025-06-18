import { Module } from '@nestjs/common';
import { BBCService } from './bbc.service';
import { CrawlerService } from './crawler.service';

@Module({
  providers: [CrawlerService, BBCService],
  exports: [CrawlerService], // ✅ bắt buộc nếu gọi từ AppModule
})
export class CrawlerModule {}
