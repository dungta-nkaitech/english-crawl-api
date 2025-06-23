import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database.service';
import { Episode } from '../interfaces/episode.interface';
import { Transcript } from '../interfaces/transcript.interface';
import { VocabItem } from '../interfaces/vocab-item.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EpisodeRepository {
  constructor(private readonly db: DatabaseService) {}

  async pushData(
    episode: Episode,
    vocabItems: VocabItem[],
    transcripts: Transcript[],
  ): Promise<string> {
    // Check if episode already exists by slug
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM episodes WHERE slug = $1 LIMIT 1`,
      [episode.slug],
    );

    if (existing.length > 0) {
      return existing[0].id; // Skip insertion if already exists
    }

    const episodeId = episode.id || uuidv4();
    const now = new Date().toISOString();

    // 1. Insert episode
    await this.db.query(
      `INSERT INTO episodes (
        id, slug, title, description,
        thumbnail_url, audio_url, pdf_url,
        published_at, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        episodeId,
        episode.slug,
        episode.title,
        episode.description,
        episode.thumbnailUrl,
        episode.audioUrl,
        episode.pdfUrl,
        episode.publishedAt,
        now,
        now,
      ],
    );

    // 2. Insert vocab items
    for (const vocab of vocabItems) {
      await this.db.query(
        `INSERT INTO vocab_items (id, episode_id, word, definition, example)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(),
          episodeId,
          vocab.word,
          vocab.definition,
          vocab.example || null,
        ],
      );
    }

    // 3. Insert transcripts
    for (const [index, t] of transcripts.entries()) {
      await this.db.query(
        `INSERT INTO transcripts (
          id, episode_id, "order", text, speaker, start_time, end_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          episodeId,
          index,
          t.text,
          t.speaker || null,
          t.startTime,
          t.endTime,
        ],
      );
    }

    return episodeId;
  }
}
