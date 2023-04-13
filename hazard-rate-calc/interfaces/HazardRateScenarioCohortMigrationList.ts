import { HazardRateScenarioCohortMigrationListItem } from "./HazardRateScenarioCohortMigrationListItem";

export interface HazardRateScenarioCohortMigrationList {
    id?: string;
    hazardRateScenarioId?: string;
    index: number;
    value: HazardRateScenarioCohortMigrationListItem[];
}
