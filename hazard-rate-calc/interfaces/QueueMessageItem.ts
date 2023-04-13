export interface QueueMessageItem {
    batchId: string;
    targetId: string;
    organisationId?: string;
    userId?: string;
}
