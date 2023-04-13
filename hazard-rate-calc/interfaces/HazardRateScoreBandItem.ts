import { BandType } from "./../enums/BandType";

export interface HazardRateScoreBandItem {
    id: string;
    type: BandType;
    position: number;
    value: string;
}
