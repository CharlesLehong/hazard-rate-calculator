export interface WeightedTermStructure {
    id?: string;
    hazardRateScenarioId?: string;
    term: number;
    value: number;
}
