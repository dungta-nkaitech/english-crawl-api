import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

type TranscriptItem = {
  order: number;
  speaker: string | null;
  text: string;
};

@Injectable()
export class BBCService {
  async crawlEpisodeDetail(url: string): Promise<IEpisodeDetail> {
    const { data }: { data: string } = await axios.get(url);
    const $ = cheerio.load(data);

    // 1. Lấy tiêu đề bài nghe
    const rawTitle = $('title').text().trim();
    const title = rawTitle.split('/').pop()?.trim() || '';

    // 2. Lấy mô tả bài học
    const description =
      $('meta[name="description"]').attr('content')?.trim() || '';

    // 3. Lấy link audio
    const audioMatch: RegExpMatchArray | null = data.match(
      /https?:\/\/[^"]+\.mp3/,
    );
    const audioUrl = audioMatch ? audioMatch[0] : null;

    // 4. Lấy link PDF nếu có
    const pdfUrl = $('a[href$=".pdf"]').attr('href') || null;

    // 5. Lấy transcript
    const transcript: TranscriptItem[] = [];
    let order = 1;

    // Xác định phần tử <p><strong style="font-size: 1.17em;">TRANSCRIPT</strong></p>
    const transcriptStart = $('p strong[style*="font-size: 1.17em"]')
      .filter((_, el) => {
        return $(el).text().trim().toUpperCase() === 'TRANSCRIPT';
      })
      .closest('p')
      .first();

    // Bỏ qua thêm 1 đoạn "Note: This is not a word-for-word transcript."
    const transcriptParagraphs = transcriptStart.nextAll('p').slice(1);

    let currentSpeaker: string | null = null;

    transcriptParagraphs.each((_, el) => {
      const html = $(el).html() || '';
      const lines = html.split(/<br\s*\/?>/i);

      lines.forEach((line) => {
        const loaded = cheerio.load(line);
        const strong = loaded('strong').text().trim();

        const textOnly = loaded.root().text().trim();

        if (strong) {
          currentSpeaker = strong;
        }

        // Nếu dòng text chỉ là tên người nói, bỏ qua
        if (textOnly === currentSpeaker) return;

        if (textOnly && currentSpeaker) {
          transcript.push({
            order: order++,
            speaker: currentSpeaker,
            text: textOnly,
          });
        }
      });
    });

    // 6. Lấy vocabulary nếu có
    const vocabItems: {
      word: string;
      definition: string;
    }[] = [];

    $('h2').each((_, el) => {
      const heading = $(el).text().toLowerCase();
      if (heading.includes('vocabulary')) {
        const vocabList = $(el).next('ul').find('li');
        vocabList.each((_, li) => {
          const text = $(li).text().trim();
          const match = text.match(/^(.+?)\s+–\s+(.*)$/); // dạng: từ – định nghĩa
          if (match) {
            vocabItems.push({
              word: match[1].trim(),
              definition: match[2].trim(),
            });
          }
        });
      }
    });

    return {
      title,
      description,
      audioUrl,
      pdfUrl,
      transcript,
      vocabItems,
    };
  }

  async crawlAllEpisodes(): Promise<IEpisodeDetail[]> {
    const BASE_URL = 'https://www.bbc.co.uk';
    const LISTING_URL = `${BASE_URL}/learningenglish/english/features/6-minute-english`;

    const { data }: { data: string } = await axios.get(LISTING_URL);
    const $ = cheerio.load(data);

    const links = new Set<string>();

    $('div.text h2 > a').each((_, el) => {
      const href = $(el).attr('href');
      if (
        href?.startsWith('/learningenglish/english/features/6-minute-english')
      ) {
        links.add(BASE_URL + href);
      }
    });

    const result: IEpisodeDetail[] = [];
    for (const url of links) {
      const detail = await this.crawlEpisodeDetail(url);
      result.push(detail);
      await this.downloadAudio(detail.audioUrl);
    }

    return result;
  }

  private async downloadAudio(url: string | null): Promise<void> {
    if (!url) return;
    const filename = url.split('/').pop();
    const dir = path.join(process.cwd(), 'public', 'audios');
    const filePath = path.join(dir, filename!);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath)) return;

    const res = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, res.data);
  }
}

export interface IEpisodeDetail {
  title: string;
  description: string;
  audioUrl: string | null;
  pdfUrl: string | null;
  transcript: {
    order: number;
    speaker: string | null;
    text: string;
  }[];
  vocabItems: {
    word: string;
    definition: string;
  }[];
}
