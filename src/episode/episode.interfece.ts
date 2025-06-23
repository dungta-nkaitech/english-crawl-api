export interface Episode {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transcript {
  id: string;
  episodeId: string;
  order: number;
  text: string;
  speaker?: string | null;
  startTime: number;
  endTime: number;
}

export interface VocabItem {
  id: string;
  episodeId: string;
  word: string;
  definition: string;
  example?: string;
}
