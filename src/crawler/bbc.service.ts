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
        const episodeUrl = url;
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

        // 1. Tìm đoạn chứa TRANSCRIPT
        const transcriptStart = $('p, h1, h2, h3, div, section')
            .filter((_, el) => {
                const text = $(el).text().trim().toUpperCase();
                return text === 'TRANSCRIPT';
            })
            .first();

        // 2. Tìm phần tử tiếp theo chứa "Note: This is not a word-for-word transcript."
        const afterNote = transcriptStart
            .nextAll()
            .filter((_, el) => {
                const text = $(el).text().trim();
                return text.includes('word-for-word');
            })
            .first();

        const transcriptParagraphs = (
            afterNote.length ? afterNote : transcriptStart
        ).nextAll('p');

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
            word: string | null;
            definition: string | null;
        }[] = [];

        $('h3').each((_, el) => {
            const heading = $(el).text().toLowerCase();
            if (heading.includes('vocabulary')) {
                let currentElement = $(el).next();

                while (
                    currentElement.length &&
                    (!transcriptStart.length ||
                        !currentElement.is(transcriptStart))
                ) {
                    if (currentElement.is('p')) {
                        const strong = currentElement.find('strong');
                        const word = strong
                            .text()
                            .replace(/\u00a0/g, ' ')
                            .trim();
                        const definition = currentElement
                            .text()
                            .replace(strong.text(), '')
                            .replace(/\u00a0/g, ' ')
                            .trim();

                        if (word && definition) {
                            vocabItems.push({ word, definition });
                        }
                    }
                    currentElement = currentElement.next();
                }
            }
        });

        // 7. Lấy thumbnail image url
        const thumbnailUrl = $('img.image-popout-video')?.attr('src') ?? '';

        // 7. Lấy quiz embed
        const quizLink = $('a[href*="riddles/"]').attr('href'); // tìm link chứa riddles/
        let riddleEmbedUrl: string | null = null;

        if (quizLink) {
            const match = quizLink.match(/riddles\/(\d+)/);
            if (match) {
                const riddleId = match[1];
                riddleEmbedUrl = `https://www.riddle.com/view/${riddleId}?type=widget`;
            }
        }

        return {
            episodeUrl,
            title,
            description,
            thumbnailUrl,
            audioUrl,
            pdfUrl,
            transcript,
            vocabItems,
            quiz: riddleEmbedUrl,
        };
    }

    async crawlEpisodeMetadata(url: string): Promise<IEpisodeDetail> {
        const episodeUrl = url;
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

        // 5. Bỏ qua không lấy transcripts
        const transcript: TranscriptItem[] = [];

        // 6. Lấy vocabulary nếu có
        // Tìm đoạn chứa TRANSCRIPT
        const transcriptStart = $('p, h1, h2, h3, div, section')
            .filter((_, el) => {
                const text = $(el).text().trim().toUpperCase();
                return text === 'TRANSCRIPT';
            })
            .first();

        // Lấy vocabulary
        const vocabItems: {
            word: string | null;
            definition: string | null;
        }[] = [];

        $('h3').each((_, el) => {
            const heading = $(el).text().toLowerCase();
            if (heading.includes('vocabulary')) {
                let currentElement = $(el).next();

                while (
                    currentElement.length &&
                    (!transcriptStart.length ||
                        !currentElement.is(transcriptStart))
                ) {
                    if (currentElement.is('p')) {
                        const strong = currentElement.find('strong');
                        const word = strong
                            .text()
                            .replace(/\u00a0/g, ' ')
                            .trim();
                        const definition = currentElement
                            .text()
                            .replace(strong.text(), '')
                            .replace(/\u00a0/g, ' ')
                            .trim();

                        if (word && definition) {
                            vocabItems.push({ word, definition });
                        }
                    }
                    currentElement = currentElement.next();
                }
            }
        });

        // 7. Lấy thumbnail image url
        const thumbnailUrl = $('img.image-popout-video')?.attr('src') ?? '';

        // 7. Lấy quiz embed
        const quizLink = $('a[href*="riddles/"]').attr('href'); // tìm link chứa riddles/
        let riddleEmbedUrl: string | null = null;

        if (quizLink) {
            const match = quizLink.match(/riddles\/(\d+)/);
            if (match) {
                const riddleId = match[1];
                riddleEmbedUrl = `https://www.riddle.com/view/${riddleId}?type=widget`;
            }
        }

        return {
            episodeUrl,
            title,
            description,
            thumbnailUrl,
            audioUrl,
            pdfUrl,
            transcript,
            vocabItems,
            quiz: riddleEmbedUrl,
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
                href?.startsWith(
                    '/learningenglish/english/features/6-minute-english',
                )
            ) {
                links.add(BASE_URL + href);
            }
        });

        const result: IEpisodeDetail[] = [];

        for (const url of links) {
            const detail = await this.crawlEpisodeDetail(url);
            if (detail.audioUrl) {
                result.push(detail);

                const { transcript, ...metadata } = detail;

                if (transcript.length === 0) {
                    const errorLogPath = path.join(
                        __dirname,
                        '..',
                        '..',
                        'public',
                        'crawl-transcript-errors.txt',
                    );
                    fs.appendFileSync(errorLogPath, `${url}\n`, 'utf-8');
                    console.warn(`transcript-errors: ${url}`);
                } else {
                    const crawlLogPath = path.join(
                        __dirname,
                        '..',
                        '..',
                        'public',
                        'crawl-transcript.txt',
                    );
                    fs.appendFileSync(crawlLogPath, `${url}\n`, 'utf-8');
                }

                this.saveTranscriptToFile(detail.audioUrl, transcript);
                this.saveMetaEpisodeToFile(detail.audioUrl, metadata);
            }
        }
        return result;
    }

    async crawlAllMetadata(): Promise<IEpisodeDetail[]> {
        const BASE_URL = 'https://www.bbc.co.uk';
        const LISTING_URL = `${BASE_URL}/learningenglish/english/features/6-minute-english`;

        const { data }: { data: string } = await axios.get(LISTING_URL);
        const $ = cheerio.load(data);

        const links = new Set<string>();

        $('div.text h2 > a').each((_, el) => {
            const href = $(el).attr('href');
            if (
                href?.startsWith(
                    '/learningenglish/english/features/6-minute-english',
                )
            ) {
                links.add(BASE_URL + href);
            }
        });

        const result: IEpisodeDetail[] = [];

        for (const url of links) {
            const detail = await this.crawlEpisodeMetadata(url);
            if (detail.audioUrl) {
                result.push(detail);

                const { transcript, ...metadata } = detail;
                this.saveMetaEpisodeToFile(detail.audioUrl, metadata);
            }
        }
        return result;
    }

    private saveMetaEpisodeToFile(audioUrl: string | null, metadata: any) {
        if (!audioUrl) return;

        if (metadata.vocabItems.length == 1)
            console.log('Episode url', metadata.episodeUrl);
        const dir = path.join(process.cwd(), 'public', 'episode-metadata');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filename = path.basename(audioUrl).replace('.mp3', '.json'); // chuyển name.mp3 -> name.json
        const filePath = path.join(dir, filename);

        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
    }

    private saveTranscriptToFile(
        audioUrl: string | null,
        transcript: TranscriptItem[],
    ) {
        if (!audioUrl) return;

        const dir = path.join(process.cwd(), 'public', 'origin-transcripts');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filename = path.basename(audioUrl).replace('.mp3', '.json'); // chuyển name.mp3 -> name.json
        const filePath = path.join(dir, filename);

        fs.writeFileSync(
            filePath,
            JSON.stringify(transcript, null, 2),
            'utf-8',
        );
    }

    async downloadAllAudios(): Promise<IEpisodeDetail[]> {
        const BASE_URL = 'https://www.bbc.co.uk';
        const LISTING_URL = `${BASE_URL}/learningenglish/english/features/6-minute-english`;

        const { data }: { data: string } = await axios.get(LISTING_URL);
        const $ = cheerio.load(data);

        const links = new Set<string>();

        $('div.text h2 > a').each((_, el) => {
            const href = $(el).attr('href');
            if (
                href?.startsWith(
                    '/learningenglish/english/features/6-minute-english',
                )
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
    episodeUrl: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    audioUrl: string | null;
    pdfUrl: string | null;
    transcript: {
        order: number;
        speaker: string | null;
        text: string;
    }[];
    vocabItems: {
        word: string | null;
        definition: string | null;
    }[];
    quiz: string | null;
}
