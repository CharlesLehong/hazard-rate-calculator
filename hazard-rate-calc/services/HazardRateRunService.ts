import Joi from "joi";
import deepClone from "../helperFunctions/deepClone";
import { HazardRateRunStatus } from "./../enums/HazardRateRunStatus";
import { HazardRateRunDbService } from "./HazardRateRunDbService";
import { BandType } from "./../enums/BandType";
import { TrackDefaultEventTypeEnums } from "./../enums/TrackDefaultEventType";
import { HazardRateScoreBandItem } from "./../interfaces/HazardRateScoreBandItem";
import { Scenario } from "./../interfaces/Scenario";
import { ScoringTableItemInterface } from "./../interfaces/ScoringTableItem";
import { ScoringTableTypeEnums } from "./../enums/ScoringTableType";
import { HazardRateCategoryData } from "./../interfaces/HazardRateCategoryData";
import { HazardRateRunParameters } from "./../interfaces/HazardRateRunParameters";
import { HazardRateRunAbsorbingState } from "./../interfaces/AbsorbingState";
import { HazardRateAgedTransaction } from "./../interfaces/HazardRateAgedTransaction";
import { ScenarioInput } from "./../interfaces/ScenarioInput";
import { ScenarioOutput } from "./../interfaces/ScenarioOutput";
import { TermStructureItem } from "./../interfaces/TermStructureItem";
import { HazardRateFacade } from "@turnbuckle/aprs-calculator-services/lib/facades/hazard-rate-facade/hazard-rate-facade";
import { Context } from "@azure/functions";

export class HazardRateRunService {
    private runDbService: HazardRateRunDbService;
    private context: Context;

    constructor(server: string, database: string, username: string, passowrd: string, context: Context) {
        this.runDbService = new HazardRateRunDbService(server, database, username, passowrd, context);
        this.context = context;
    }

    async calculateHazardRateRun(runId: string) {
        try {
            this.context.log(`Starting Hazard Rate Run: ${runId}`);

            await this.runDbService.initializeConnectionPool();
            await this.runDbService.updateHazardRateRunStatus(runId, HazardRateRunStatus.CALCULATING);

            this.context.log("Loading Hazard Rate Run Data");
            const {
                dayScorebands,
                statusScorebands,
                internalScoreScorebands,
                runParameters,
                cateogryData,
                absorbingStates,
                ageAnalysis,
            } = await this.fetchHazardRateRunData(runId);
            this.context.log(`Done Loading Hazard Rate Run Data - Age Analysis Size: ${ageAnalysis?.length}`);

            this.context.log("Deleting Old Hazard Rate Run Results");
            this.runDbService.deleteOldHazardRateRunResults(runId);

            const lgdApproaches: TrackDefaultEventTypeEnums[] = [
                TrackDefaultEventTypeEnums.Lifetime,
                TrackDefaultEventTypeEnums.LifetimeSingle,
                // TrackDefaultEventTypeEnums.LifetimeMultiple,
                TrackDefaultEventTypeEnums.TwelveMonthSingle,
            ];

            this.context.log("Generating Hazard Rate Run Scenarios.");
            const scenarios = this.generateHazardRateRunScenarios(
                dayScorebands,
                statusScorebands,
                internalScoreScorebands,
                lgdApproaches,
                cateogryData
            );

            this.context.log(`Processing ${scenarios.length} Hazard Rate Run Scenarios.`);
            await this.processScenarios(scenarios, runParameters, absorbingStates, ageAnalysis, runId);
            this.context.log("Successfully Processed All Scenarios");
            await this.runDbService.updateHazardRateRunStatus(runId, HazardRateRunStatus.CALCULATED);
            this.context.log("Hazard Rate Run Complete.");
            this.runDbService.closeConnectionPool();
        } catch (error) {
            await this.runDbService.updateHazardRateRunStatus(runId, HazardRateRunStatus.QUEUE_ERROR);
            this.runDbService.closeConnectionPool();
            throw error;
        }
    }

    private async fetchHazardRateRunData(runId: string) {
        try {
            this.context.log("Fetching Hazard Rate Run");
            this.context.log("...Fetching Score Bands");
            const scoreBands = await this.fetchHazardRateScoreBands(runId);
            const dayScorebands = scoreBands.filter((band) => band.type == BandType.DAY);
            const statusScorebands = scoreBands.filter((band) => band.type == BandType.STATUS);
            const internalScoreScorebands = scoreBands.filter((band) => band.type == BandType.INTERNAL_SCORE);

            this.context.log("...Fetching Run Parameters");
            const runParameters = await this.runDbService.fetchHazardRateRunParameters(runId);

            this.context.log("...Fetching Run Category Data");
            const cateogryData = await this.runDbService.fetchHarzardCategoryData(runId);

            this.context.log("...Fetching Run Absorbing States");
            const absorbingStates = await this.runDbService.fetchAbsorbingStates(runId);

            this.context.log("...Fetching Run Age Analysis");
            const ageAnalysis = await this.runDbService.fetchHazardRateAgedTransaction(runId, runParameters);
            return {
                dayScorebands,
                statusScorebands,
                internalScoreScorebands,
                runParameters,
                cateogryData,
                absorbingStates,
                ageAnalysis,
            };
        } catch (err) {
            await this.runDbService.updateHazardRateRunStatus(runId, HazardRateRunStatus.AGED);
            throw err;
        }
    }

    private async fetchHazardRateScoreBands(runId: string): Promise<HazardRateScoreBandItem[]> {
        const scoreBands = await this.runDbService.fetchHazardRateScoreBandItems(runId);
        const sortedBands = scoreBands.sort((a, b) => {
            if (a.type == BandType.DAY) return -(+b.value - +a.value);
            else if ([BandType.STATUS, BandType.INTERNAL_SCORE].includes(a.type)) return -(b.position - a.position);
        });
        return sortedBands;
    }

    private generateHazardRateRunScenarios(
        dayScorebands: HazardRateScoreBandItem[],
        statusScorebands: HazardRateScoreBandItem[],
        internalScoreScorebands: HazardRateScoreBandItem[],
        lgdApproaches: TrackDefaultEventTypeEnums[],
        cateogryData: HazardRateCategoryData
    ): Scenario[] {
        const scenarios: Scenario[] = [];
        if (dayScorebands.length > 0) {
            const scoringTable: ScoringTableItemInterface[] = [];
            dayScorebands.forEach((scoreband, index, arr) => {
                if (index == 0) {
                    scoringTable.push({
                        minDays: undefined,
                        maxDays: +scoreband.value,
                        rating: 1,
                    });
                }
                scoringTable.push({
                    minDays: +scoreband.value,
                    maxDays: arr[index + 1]?.value ? +arr[index + 1]?.value : undefined,
                    rating: index + 2,
                });
            });

            for (const lgdApproach of lgdApproaches) {
                scenarios.push({
                    scoringType: ScoringTableTypeEnums.ageing,
                    category1: undefined,
                    scoringTable,
                    lgdApproach: lgdApproach,
                });
            }

            for (const category1 of cateogryData.category1) {
                for (const lgdApproach of lgdApproaches) {
                    scenarios.push({
                        scoringType: ScoringTableTypeEnums.ageing,
                        category1: category1,
                        scoringTable,
                        lgdApproach: lgdApproach,
                    });
                }
            }
        }

        if (statusScorebands.length > 0) {
            const scoringTable: ScoringTableItemInterface[] = [];

            statusScorebands.forEach((scoreband, index, arr) => {
                scoringTable.push({
                    rating: index + 1,
                    contains: scoreband.value.split("(_)"),
                });
            });

            for (const lgdApproach of lgdApproaches) {
                scenarios.push({
                    scoringType: ScoringTableTypeEnums.status,
                    category1: undefined,
                    scoringTable,
                    lgdApproach: lgdApproach,
                });
            }

            for (const category1 of cateogryData.category1) {
                for (const lgdApproach of lgdApproaches) {
                    scenarios.push({
                        scoringType: ScoringTableTypeEnums.status,
                        category1: category1,
                        scoringTable,
                        lgdApproach: lgdApproach,
                    });
                }
            }
        }

        if (internalScoreScorebands.length > 0) {
            const scoringTable: ScoringTableItemInterface[] = [];

            internalScoreScorebands.forEach((scoreband, index, arr) => {
                scoringTable.push({
                    rating: index + 1,
                    contains: scoreband.value.split("(_)"),
                });
            });

            for (const lgdApproach of lgdApproaches) {
                scenarios.push({
                    scoringType: ScoringTableTypeEnums.internalScore,
                    category1: undefined,
                    scoringTable,
                    lgdApproach: lgdApproach,
                });
            }

            for (const category1 of cateogryData.category1) {
                for (const lgdApproach of lgdApproaches) {
                    scenarios.push({
                        scoringType: ScoringTableTypeEnums.internalScore,
                        category1: category1,
                        scoringTable,
                        lgdApproach: lgdApproach,
                    });
                }
            }
        }

        return scenarios;
    }

    private async processScenarios(
        scenarios: Scenario[],
        runParameters: HazardRateRunParameters,
        absorbingStates: HazardRateRunAbsorbingState,
        ageAnalysis: HazardRateAgedTransaction[],
        runId: string
    ): Promise<void> {
        let counter = 1;
        for (const scenario of scenarios) {
            const { scoringTable, scoringType, category1 } = scenario;
            runParameters.category1 = category1;

            let absorbingState = absorbingStates.daysAbsorbingState;
            let defaultBucket: ScoringTableItemInterface = {
                rating: 0,
            };
            let maxRating: number = scoringTable[scoringTable.length - 1].rating;

            if (scoringType == ScoringTableTypeEnums.ageing) {
                defaultBucket = scoringTable[scoringTable.length - 1];
                if (absorbingState == 2) maxRating += 1;
            } else if (scoringType == ScoringTableTypeEnums.internalScore)
                defaultBucket = scoringTable[scoringTable.length - absorbingState];
            else if (scoringType == ScoringTableTypeEnums.status)
                defaultBucket = scoringTable[scoringTable.length - absorbingState];

            // filter the age analysis to only include the category1
            const filteredAgeAnalysis = ageAnalysis.filter((aa) => {
                if (category1) {
                    return aa.category1 == category1;
                }
                return true;
            });

            const scenarioAgeAnalysis = deepClone(filteredAgeAnalysis);
            const scenarioInput = {
                interestRate: runParameters.lgdInterestRate,
                ageAnalysis: scenarioAgeAnalysis,
                defaultsRating: defaultBucket.rating,
                scoringTable,
                scoringType,
                trackDefaultEvents: scenario.lgdApproach,
                absorbingStates: absorbingState,
                eadCalculationApproach: runParameters.eadCalculationApproach,
                dataFrequencyScalar: runParameters.cohortPDOutcomePeriod,
                maxRating: maxRating,
                runParameters: runParameters,
            };

            const scenarioOutput = await this.calculateScenario(scenarioInput);

            const { termStructure, weightedTermStructure, errors, cohortMatrix, migrationMatrix } = scenarioOutput;

            let cohortMigrationMatrix = [];
            for (let i = 0; i < cohortMatrix.length; i++) {
                let row = [];
                for (let j = 0; j < cohortMatrix[i].length; j++) {
                    row.push({
                        value: cohortMatrix[i][j],
                        index: j,
                    });
                }
                cohortMigrationMatrix.push({
                    index: i,
                    value: row,
                });
            }

            scenario.cohortMigrationMatrix = cohortMigrationMatrix;

            let hazardRateMigrationMatrix = [];
            for (let i = 0; i < migrationMatrix.length; i++) {
                let row = [];
                for (let j = 0; j < migrationMatrix[i].length; j++) {
                    row.push({
                        value: migrationMatrix[i][j],
                        index: j,
                    });
                }
                hazardRateMigrationMatrix.push({
                    index: i,
                    value: row,
                });
            }

            scenario.hazardRateMigrationMatrix = hazardRateMigrationMatrix;
            scenario.termStructure = termStructure;
            scenario.weightedTermStructure = weightedTermStructure;

            // add run for saving
            scenario.hazardRateRunId = runId;

            function compileError(errors: string[]) {
                // validate errors are not empty and are all strings
                Joi.array().min(1).items(Joi.string().required()).validate(errors);

                let errorStr: string;
                if (errors.length > 1) {
                    const lastError = errors.pop();
                    errorStr = `${errors.join(", ")} and ${lastError}`;
                } else {
                    errorStr = errors[0];
                }
                return errorStr;
            }

            if (errors.length > 0) scenario.error = compileError(errors);
            this.context.log(`Saving Scenario ${counter} to the Database`);
            const dbScenario = await this.runDbService.createHazardRateRunScenario(scenario);
            if (dbScenario.id) {
                const scenarioId = dbScenario.id;
                await this.runDbService.bulkInsertTermStructures(scenario.termStructure, scenarioId);
                await this.runDbService.bulkInsertWeightedTermStructures(scenario.weightedTermStructure, scenarioId);

                for (const item of scenario.cohortMigrationMatrix)
                    await this.runDbService.insertCohortMigrationListItem({
                        ...item,
                        hazardRateScenarioId: scenarioId,
                    });

                for (const item of scenario.hazardRateMigrationMatrix)
                    await this.runDbService.insertHazardMigrationListItem({
                        ...item,
                        hazardRateScenarioId: scenarioId,
                    });
            }

            this.context.log(`Saving Scenario ${counter} Completed`);
            counter++;
        }
    }

    private async calculateScenario(scenario: ScenarioInput): Promise<ScenarioOutput> {
        const errors: string[] = [];
        let termStructure: TermStructureItem[] = [];
        let weightedTermStructure: TermStructureItem[] = [];
        {
            const lgdMinDate: number = new Date(scenario.runParameters.lgdMinDate).getTime();
            const lgdMaxDate: number = new Date(scenario.runParameters.lgdMaxDate).getTime();
            const lgdAgeAnalysis = scenario.ageAnalysis.filter(
                (ageTransaction) =>
                    new Date(ageTransaction.date).getTime() >= lgdMinDate &&
                    new Date(ageTransaction.date).getTime() <= lgdMaxDate
            );
            const calculateLgdTermStructureInput = {
                interestRate: scenario.interestRate,
                ageAnalysis: deepClone(lgdAgeAnalysis),
                defaultsRating: scenario.defaultsRating,
                scoringTable: scenario.scoringTable,
                scoringType: scenario.scoringType,
                trackDefaultEvents: scenario.trackDefaultEvents,
                absorbingStates: scenario.absorbingStates,
                eadCalculationApproach: scenario.eadCalculationApproach,
            };

            const { termStructure: _termStructure, weightedTermStructure: _weightedTermStructure } =
                await HazardRateFacade.calculateLgdTermStructure(calculateLgdTermStructureInput).catch((err) => {
                    errors.push("Error Calculating LGD Term Structure");
                    return {
                        termStructure: [],
                        weightedTermStructure: [],
                    };
                });

            termStructure = _termStructure;
            weightedTermStructure = _weightedTermStructure;
        }

        let cohortMatrix: number[][] = [];
        let migrationMatrix: number[][] = [];
        {
            const pdMinDate: number = new Date(scenario.runParameters.cohortPDMinDate).getTime();
            const pdMaxDate: number = new Date(scenario.runParameters.cohortPDMaxDate).getTime();
            const pdAgeAnalysis = scenario.ageAnalysis.filter(
                (ageTransaction) =>
                    new Date(ageTransaction.date).getTime() >= pdMinDate &&
                    new Date(ageTransaction.date).getTime() <= pdMaxDate
            );
            const calculatePdInput = {
                ageAnalysis: deepClone(pdAgeAnalysis),
                absorbingStates: scenario.absorbingStates,
                dataFrequencyScalar: scenario.dataFrequencyScalar,
                maxRating: scenario.maxRating,
                scoringTable: scenario.scoringTable,
                scoringType: scenario.scoringType,
            };

            const { cohortMatrix: _cohortMatrix, migrationMatrix: _migrationMatrix } =
                await HazardRateFacade.calculateAllMatrices(calculatePdInput).catch((err) => {
                    errors.push("Error calculating PD Matrices");
                    return {
                        cohortMatrix: [],
                        migrationMatrix: [],
                    };
                });

            cohortMatrix = _cohortMatrix;
            migrationMatrix = _migrationMatrix;
        }

        return {
            cohortMatrix,
            errors,
            migrationMatrix,
            termStructure,
            weightedTermStructure,
        };
    }
}
