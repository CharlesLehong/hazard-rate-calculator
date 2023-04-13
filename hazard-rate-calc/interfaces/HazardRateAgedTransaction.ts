export interface HazardRateAgedTransaction {
    id: string;
    transactionNumber: string;
    type?: number;
    category1: string;
    date: Date;
    amount: number;
    balance?: number;
    status?: string;
    ageing?: number;
    limit?: number;
    score?: string;
}
