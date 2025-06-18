import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

        let textOnly = loaded.root().text().trim();

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
