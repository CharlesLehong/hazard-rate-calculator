const v8 = require("v8");
const deepClone = (item) => {
    return v8.deserialize(v8.serialize(item));
};

export default deepClone;
