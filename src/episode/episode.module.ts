// src/episode/episode.module.ts
import { Module } from '@nestjs/common';
import { EpisodeRepository } from './episode-repository';
import { EpisodeService } from './episode.service';
import { DatabaseService } from '../common/database.service';

@Module({
  providers: [EpisodeService, EpisodeRepository, DatabaseService],
  exports: [EpisodeService],
})
export class EpisodeModule {}
