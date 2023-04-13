import { TermStructureItem } from "./TermStructureItem";

export interface ScenarioOutput {
    termStructure: TermStructureItem[];
    weightedTermStructure: TermStructureItem[];
    errors: string[];
    cohortMatrix: number[][];
    migrationMatrix: number[][];
}
