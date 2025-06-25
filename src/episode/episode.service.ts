// src/episode/episode.service.ts
import { Injectable } from '@nestjs/common';
import { EpisodeRepository } from './episode-repository';
import { IEpisode, IVocabItem, ITranscript } from './episode.interfece';

@Injectable()
export class EpisodeService {
    constructor(private readonly repo: EpisodeRepository) {}

    async saveEpisodeData(
        episode: IEpisode,
        vocabItems: IVocabItem[],
        transcripts: ITranscript[],
    ): Promise<string> {
        return this.repo.pushData(episode, vocabItems, transcripts);
    }
}
