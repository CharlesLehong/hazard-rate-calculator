export interface ScoringTableItemInterface {
    rating: number;
    contains?: string[];
    minDays?: number | null | undefined;
    maxDays?: number | null | undefined;
}
