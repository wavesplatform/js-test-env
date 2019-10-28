const augment = require('./augment').default;
let global;
try {
    global = Function('return this')();
} catch (e) {
    global = window;
}
augment(global);
global.env = {
    API_BASE: 'https://nodes-testnet.wavesnodes.com',
    SEED: 'default seed',
    CHAIN_ID: 'T',
    timeout: 20000
};
