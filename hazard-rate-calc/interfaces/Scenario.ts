import { TrackDefaultEventTypeEnums } from "./../enums/TrackDefaultEventType";
import { ScoringTableItemInterface } from "./ScoringTableItem";
import { ScoringTableTypeEnums } from "./../enums/ScoringTableType";
import { HazardRateScenarioCohortMigrationList } from "./HazardRateScenarioCohortMigrationList";
import { WeightedTermStructure } from "./WeightedTermStructure";
import { HazardRateScenarioHazardMigrationList } from "./HazardRateScenarioHazardMigrationList";
import { TermStructureItem } from "./TermStructureItem";

export interface Scenario {
    id?: string;
    hazardRateRunId?: string;
    scoringType: ScoringTableTypeEnums;
    category1?: string;
    category2?: string;
    category3?: string;
    // lgdApproach: number;
    scoringTable: ScoringTableItemInterface[];
    lgdApproach: TrackDefaultEventTypeEnums;

    cohortMigrationMatrix?: HazardRateScenarioCohortMigrationList[];
    hazardRateMigrationMatrix?: HazardRateScenarioHazardMigrationList[];
    termStructure?: TermStructureItem[];
    weightedTermStructure?: WeightedTermStructure[];
    error?: string;
}
