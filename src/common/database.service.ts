import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client!: Client; // ✅ Non-null assertion

  async onModuleInit() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('❌ DATABASE_URL not found in .env');
    }

    this.client = new Client({ connectionString: url });
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.end(); // ✅ Safe call because client! was assigned in onModuleInit
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const res: QueryResult<T> = await this.client.query(sql, params);
    return res.rows;
  }
}
