import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database.service';
import { IEpisode, ITranscript, IVocabItem } from './episode.interfece';

@Injectable()
export class EpisodeRepository {
    constructor(private readonly db: DatabaseService) {}

    async pushData(
        episode: IEpisode,
        vocabItems: IVocabItem[],
        transcripts: ITranscript[],
    ): Promise<string> {
        // Check nếu đã tồn tại theo episode_url
        const existing = await this.db.query<{ id: string }>(
            `SELECT id FROM episodes WHERE episode_url = $1 LIMIT 1`,
            [episode.episodeUrl],
        );

        if (existing.length > 0) {
            return existing[0].id;
        }

        const now = new Date().toISOString();

        // Insert episode
        await this.db.query(
            `INSERT INTO episodes (
                id, title, description,
                thumbnail_url, audio_url, pdf_url,
                episode_url, quiz_url, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
                episode.id,
                episode.title,
                episode.description || null,
                episode.thumbnailUrl || null,
                episode.audioUrl || null,
                episode.pdfUrl || null,
                episode.episodeUrl,
                episode.quizUrl || null,
                now,
            ],
        );

        // Insert vocab items
        for (const vocab of vocabItems) {
            await this.db.query(
                `INSERT INTO vocab_items (id, episode_id, word, definition, example)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    vocab.id,
                    episode.id,
                    vocab.word,
                    vocab.definition,
                    vocab.example || null,
                ],
            );
        }

        // Insert transcripts
        for (const t of transcripts) {
            await this.db.query(
                `INSERT INTO transcripts (
                    id, episode_id, "order", text, speaker, start_time, end_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    t.id,
                    episode.id,
                    t.order,
                    t.text,
                    t.speaker || null,
                    t.startTime,
                    t.endTime,
                ],
            );
        }

        return episode.id;
    }
}
