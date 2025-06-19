import { Module } from '@nestjs/common';
import { BbcController } from './bbc.controller';
import { BBCService } from './bbc.service';

@Module({
  controllers: [BbcController],
  providers: [BBCService],
})
export class BbcModule {}
