import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CrawlerService } from './crawler/crawler.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);

    // const crawlerService = app.get(CrawlerService);

    // const url =
    //     'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2023/ep-230810'; // URL bài cần crawl

    // const result = await crawlerService.crawlOneEpisode(url);

    // console.log('✅ Crawl complete');
    // console.log(result);

    // await app.close();
}
bootstrap();
