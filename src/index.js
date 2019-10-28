import augment from './augment';

augment(global);
(global as any).env = {
    API_BASE: 'https://nodes-testnet.wavesnodes.com',
    SEED: 'default seed',
    CHAIN_ID: 'T'
};
