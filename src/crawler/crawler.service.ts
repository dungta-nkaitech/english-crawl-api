import { Injectable, Logger } from '@nestjs/common';
import { BBCService, IEpisodeDetail } from './bbc.service';

@Injectable()
export class CrawlerService {
  constructor(private readonly bbcService: BBCService) {}

  async crawlOneEpisode(url: string): Promise<IEpisodeDetail> {
    const result: IEpisodeDetail =
      await this.bbcService.crawlEpisodeDetail(url);

    Logger.log(` EpisodeUrl: ${result.episodeUrl}`);
    Logger.log(` Thumbnail: ${result.thumbnailUrl}`);
    Logger.log(` Audio: ${result.audioUrl}`);
    Logger.log(` Description: ${result.description}`);
    Logger.log(` PDF: ${result.pdfUrl}`);
    Logger.log(` Transcript first line: ${result.transcript[0].text} `);

    // result.transcript.forEach((line, index) => {
    //   Logger.log(`${index + 1}. [${line.speaker}] ${line.text}`);
    // });
    Logger.log(` Vocab first: ${result.vocabItems[0].word} `);
    Logger.log(` Quiz: ${result.quiz} `);

    return result;
  }
}
