import { Controller, Get } from '@nestjs/common';
import { BBCService } from './bbc.service';

@Controller('bbc')
export class BbcController {
  constructor(private readonly bbcService: BBCService) {}

  @Get('crawl-all')
  async crawlAll() {
    const data = await this.bbcService.crawlAllEpisodes();
    return data.map((item) => ({
      title: item.title,
      audio: item.audioUrl,
    }));
  }
}
