import { EadCalculationApproachEnums } from "@turnbuckle/aprs-calculator-services/lib/enums/ead-calculation-approach.enums";

export interface HazardRateRunParameters {
    id: string;
    category1?: string;
    category2?: string;
    category3?: string;
    lgdRunDate: Date;
    lgdMinDate: Date;
    lgdMaxDate: Date;
    lgdInterestRate: number;
    hazardPDRunDate: Date;
    hazardPDMinDate: Date;
    hazardPDMaxDate: Date;
    cohortPDRunDate: Date;
    cohortPDMinDate: Date;
    cohortPDMaxDate: Date;
    cohortPDOutcomePeriod: number;
    eadCalculationApproach: EadCalculationApproachEnums;
}
