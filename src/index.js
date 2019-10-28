const augment = require('./augment').default;
let globalObj;
try {
    globalObj = Function('return this')();
} catch (e) {
    globalObj = window;
}
augment(globalObj);
globalObj.env = {
    API_BASE: 'https://nodes-testnet.wavesnodes.com',
    SEED: 'default seed',
    CHAIN_ID: 'T',
    timeout: 20000
};
