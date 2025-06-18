import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CrawlerService } from './crawler/crawler.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  const crawler = app.get(CrawlerService);
  await crawler.crawlOneEpisode(
    'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2025/ep-250605',
  );
}
bootstrap();
