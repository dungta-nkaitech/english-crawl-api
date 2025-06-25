export class TranscriptDto {
    id: string;
    episodeId: string;
    order: number;
    speaker?: string;
    text: string;
    startTime: number;
    endTime: number;
}
