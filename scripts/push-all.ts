import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EpisodeService } from '../src/episode/episode.service';
import {
    IEpisode,
    ITranscript,
    IVocabItem,
} from '../src/episode/episode.interfece';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const episodeService = app.get(EpisodeService);

    const metaDir = path.join(__dirname, '../publics/episode-metadata');
    const transcriptDir = path.join(
        __dirname,
        '../publics/normalized-transcripts',
    );

    const files = await fs.readdir(metaDir);

    for (const fileName of files) {
        if (!fileName.endsWith('.json')) continue;

        const metaPath = path.join(metaDir, fileName);
        const transcriptPath = path.join(transcriptDir, fileName);

        try {
            const metaRaw = await fs.readFile(metaPath, 'utf8');
            const meta = JSON.parse(metaRaw) as Omit<IEpisode, 'id'> & {
                vocabItems?: Omit<IVocabItem, 'id' | 'episodeId'>[];
            };

            let transcriptData: {
                start: number;
                end: number;
                text: string;
                speaker: string | null;
            }[] = [];

            try {
                const transcriptRaw = await fs.readFile(transcriptPath, 'utf8');
                transcriptData = JSON.parse(transcriptRaw) as Array<{
                    start: number;
                    end: number;
                    text: string;
                    speaker: string | null;
                }>;
            } catch {
                console.warn(
                    `⚠️  No transcript found for ${fileName}, skipping...`,
                );
                continue;
            }

            const episodeId = generateIdFromUrl(meta.episodeUrl);

            const episode: IEpisode = {
                id: episodeId,
                episodeUrl: meta.episodeUrl,
                title: meta.title,
                description: meta.description,
                audioUrl: meta.audioUrl,
                thumbnailUrl: meta.thumbnailUrl,
                pdfUrl: meta.pdfUrl,
                quizUrl: meta.quizUrl,
            };

            const vocabItems: IVocabItem[] = (meta.vocabItems || []).map(
                (v) => ({
                    id: uuidv4(),
                    episodeId: episodeId,
                    word: v.word,
                    definition: v.definition,
                    example: v.example,
                }),
            );

            const transcripts: ITranscript[] = transcriptData.map(
                (t, index) => ({
                    id: uuidv4(),
                    episodeId: episodeId,
                    order: index,
                    text: t.text,
                    speaker: t.speaker || null,
                    startTime: t.start,
                    endTime: t.end,
                }),
            );

            console.log('Url', episode.episodeUrl);

            const savedId = await episodeService.saveEpisodeData(
                episode,
                vocabItems,
                transcripts,
            );

            console.log(`✅ Pushed: ${episode.title} → ID: ${savedId}`);
        } catch (err) {
            console.error(`❌ Failed: ${fileName}`, err);
        }
    }

    await app.close();
}

function generateIdFromUrl(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
}

bootstrap();
