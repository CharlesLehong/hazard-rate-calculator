import { AzureFunction, Context } from "@azure/functions";
import { QueueMessageItem } from "./interfaces/QueueMessageItem";
import { HazardRateRunService } from "./services/HazardRateRunService";
import fetchDbConnectionStringFromVault from "./helperFunctions/fetchDbConnectionStringFromVault";
import getLoginPropertiesFromConnectionString from "./helperFunctions/getLoginPropertiesFromConnectionString";

const queueTrigger: AzureFunction = async function (
    context: Context,
    queueMessageItem: QueueMessageItem
): Promise<void> {
    try {
        context.log("Fetching Connection String From Vault");
        const connectionString = await fetchDbConnectionStringFromVault(queueMessageItem.targetId);
        const { server, database, username, password } = getLoginPropertiesFromConnectionString(connectionString);
        const runService = new HazardRateRunService(server, database, username, password, context);
        await runService.calculateHazardRateRun(queueMessageItem.batchId);
    } catch (err) {
        context.log("Hazard Rate Run Failed");
        context.log(err);
    }
};

export default queueTrigger;
