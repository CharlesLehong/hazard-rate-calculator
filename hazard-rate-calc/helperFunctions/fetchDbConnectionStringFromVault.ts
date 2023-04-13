import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import * as dotenv from "dotenv";
dotenv.config();

const fetchDbConnectionStringFromVault = async (connectionName: string) => {
    try {
        const credential = new DefaultAzureCredential();
        const url = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
        const client = new SecretClient(url, credential);
        const secret = await client.getSecret(connectionName);
        return secret?.value;
    } catch (error) {
        console.log(error);
        throw new Error(error);
    }
};

export default fetchDbConnectionStringFromVault;
