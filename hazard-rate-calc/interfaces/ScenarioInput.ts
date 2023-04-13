import { ScoringTableTypeEnums } from "./../enums/ScoringTableType";
import { HazardRateAgedTransaction } from "./HazardRateAgedTransaction";
import { HazardRateRunParameters } from "./HazardRateRunParameters";
import { ScoringTableItemInterface } from "./ScoringTableItem";
import { TrackDefaultEventTypeEnums } from "./../enums/TrackDefaultEventType";
import { EadCalculationApproachEnums } from "./../enums/EadCalculationApproach";

export interface ScenarioInput {
    runParameters: HazardRateRunParameters;
    interestRate: number;
    ageAnalysis: HazardRateAgedTransaction[];
    defaultsRating: number;
    scoringTable: ScoringTableItemInterface[];
    scoringType: ScoringTableTypeEnums;
    trackDefaultEvents: TrackDefaultEventTypeEnums;
    absorbingStates: number;
    eadCalculationApproach: EadCalculationApproachEnums;
    dataFrequencyScalar: number;
    maxRating: number;
}
