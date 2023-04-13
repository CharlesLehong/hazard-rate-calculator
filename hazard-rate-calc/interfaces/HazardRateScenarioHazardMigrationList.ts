import { HazardRateScenarioHazardMigrationListItem } from "./HazardRateScenarioHazardMigrationListItem";

export interface HazardRateScenarioHazardMigrationList {
    id?: string;
    hazardRateScenarioId?: string;
    index: number;
    value: HazardRateScenarioHazardMigrationListItem[];
}
