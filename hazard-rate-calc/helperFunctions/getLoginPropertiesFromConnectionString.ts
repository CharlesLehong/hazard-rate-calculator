import { DatabaseCredentials } from "./../interfaces/DatabaseCredentials";
const getLoginPropertiesFromConnectionString = (connectionString: string): DatabaseCredentials => {
    if (!connectionString) return null;
    const connectionStringParts = connectionString.split(";");
    return {
        server: getConnectionItemValue(connectionStringParts, "data source", "server"),
        database: getConnectionItemValue(connectionStringParts, "initial catalog", "database"),
        username: getConnectionItemValue(connectionStringParts, "user id"),
        password: getConnectionItemValue(connectionStringParts, "password"),
    };
};

const getConnectionItemValue = (parts: string[], key: string, altKey: string = ""): string => {
    const item = parts.find((p) => {
        const indexOfEqualSign = p.indexOf("=");
        const partKey = p.substring(0, indexOfEqualSign).toLowerCase();
        if (partKey === key.toLowerCase() || partKey === altKey.toLowerCase()) return true;
        return false;
    });
    if (item) return item.substring(item.indexOf("=") + 1, item.length);
    return null;
};

export default getLoginPropertiesFromConnectionString;
