import { Injectable, Logger } from '@nestjs/common';
import { BBCService, IEpisodeDetail } from './bbc.service';

@Injectable()
export class CrawlerService {
  constructor(private readonly bbcService: BBCService) {}

  async crawlOneEpisode(url: string): Promise<IEpisodeDetail> {
    const result: IEpisodeDetail =
      await this.bbcService.crawlEpisodeDetail(url);

    Logger.log(`🎧 Title: ${result.title}`);
    Logger.log(`🔗 Audio: ${result.audioUrl}`);
    Logger.log(`📝 Description: ${result.description}`);
    Logger.log('📜 Transcript lines:');
    result.transcript.forEach((line, index) => {
      Logger.log(`${index + 1}. [${line.speaker}] ${line.text}`);
    });

    return result;
  }
}
