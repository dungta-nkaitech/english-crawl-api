import { Injectable } from '@nestjs/common';
import { BBCService, IEpisodeDetail } from './bbc.service';

@Injectable()
export class CrawlerService {
    constructor(private readonly bbcService: BBCService) {}

    async crawlOneEpisode(url: string): Promise<IEpisodeDetail> {
        const result: IEpisodeDetail =
            await this.bbcService.crawlEpisodeDetail(url);
        return result;
    }
}
