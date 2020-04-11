import * as wt from '@waves/waves-transactions';
import { IMassTransferItem, INodeRequestOptions } from '@waves/waves-transactions';
import { compile as cmpl } from '@waves/ride-js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const NO_SEED_MSG = `Seed is undefined. Please check that you have seed in your config file or web ide settings`;

export type TSetupAccountsFunc = (balances: Record<string, number>, options?: {masterSeed: string, nonce: string}) =>
    Promise<Record<string, string>>

export interface IAugmentOptions  {
    broadcastWrapper?: (f: typeof wt.broadcast) => typeof wt.broadcast
    setupAccountsWrapper?: (f : TSetupAccountsFunc) => TSetupAccountsFunc
}
export default function augment(global: any, options?: IAugmentOptions) {
    function withDefaults(options: INodeRequestOptions = {apiBase: global.env.API_BASE}) {
        return {
            timeout: options.timeout || global.env.timeout || 20000,
            apiBase: options.apiBase || global.env.API_BASE
        };
    }

    const envSeed = () => global.env.SEED || (() => {
        throw new Error(NO_SEED_MSG);
    })();

    function currentAddress() {
        return wt.libs.crypto.address(envSeed(), global.env.CHAIN_ID);
    }

    function injectEnv<T extends (pp: any, ...args: any[]) => any>(f: T) {
        return (po: wt.TTxParams, seed?: wt.TSeedTypes | null): ReturnType<typeof f> =>
            f({
                    chainId: global.env.CHAIN_ID,
                    additionalFee: global.env.defaultAdditionalFee,
                    ...po
                },
                seed === null ? null : seed || envSeed()
            );
    }

    global.wavesCrypto = wt.libs.crypto;
    global.chai = chai;
    global.expect = chai.expect;

    global.alias = injectEnv(wt.alias);
    global.burn = injectEnv(wt.burn);
    global.cancelLease = injectEnv(wt.cancelLease);
    global.cancelOrder = injectEnv(wt.cancelOrder);
    global.data = injectEnv(wt.data);
    global.issue = injectEnv(wt.issue);
    global.reissue = injectEnv(wt.reissue);
    global.lease = injectEnv(wt.lease);
    global.massTransfer = injectEnv(wt.massTransfer);
    global.order = injectEnv(wt.order);
    global.transfer = injectEnv(wt.transfer);
    global.setScript = injectEnv(wt.setScript);
    global.setAssetScript = injectEnv(wt.setAssetScript);
    global.invokeScript = injectEnv(wt.invokeScript);
    global.sponsorship = injectEnv(wt.sponsorship);
    global.signTx = injectEnv(wt.signTx);

    global.waitForTx = async (txId: string, options?: INodeRequestOptions) =>
        wt.nodeInteraction.waitForTx(txId, withDefaults(options));
    global.waitForTxWithNConfirmations = async (txId: string, confirmations: number, options?: INodeRequestOptions) =>
        wt.nodeInteraction.waitForTxWithNConfirmations(txId, confirmations, withDefaults(options));
    global.waitNBlocks = (blocksCount: number, options?: INodeRequestOptions) =>
        wt.nodeInteraction.waitNBlocks(blocksCount, withDefaults(options));
    global.currentHeight = (apiBase?: string) =>
        wt.nodeInteraction.currentHeight(apiBase || global.env.API_BASE);
    global.transactionById = (txId: string, apiBase?: string) =>
        wt.nodeInteraction.transactionById(txId, apiBase || global.env.API_BASE);
    global.waitForHeight = (target: number, options?: INodeRequestOptions) =>
        wt.nodeInteraction.waitForHeight(target, withDefaults(options));
    global.balance = (address?: string, apiBase?: string) =>
        wt.nodeInteraction.balance(address || currentAddress(), apiBase || global.env.API_BASE);
    global.assetBalance = (assetId: string, address?: string, apiBase?: string) =>
        wt.nodeInteraction.assetBalance(assetId, address || currentAddress(), apiBase || global.env.API_BASE);
    global.balanceDetails = (address?: string, apiBase?: string) =>
        wt.nodeInteraction.balanceDetails(address || currentAddress(), apiBase || global.env.API_BASE);
    global.accountData = (address?: string, apiBase?: string) =>
        wt.nodeInteraction.accountData(address || currentAddress(), apiBase || global.env.API_BASE);
    global.accountDataByKey = (key: string, address?: string, apiBase?: string) =>
        wt.nodeInteraction.accountDataByKey(key, address || currentAddress(), apiBase || global.env.API_BASE);
    global.stateChanges = (invokeScriptTxId: string, apiBase?: string) =>
        wt.nodeInteraction.stateChanges(invokeScriptTxId, apiBase || global.env.API_BASE);
    global.broadcast = (tx: wt.TTx, apiBase?: string) => options && options.broadcastWrapper
        ? options.broadcastWrapper(wt.nodeInteraction.broadcast)(tx, apiBase || global.env.API_BASE)
        : wt.nodeInteraction.broadcast(tx, apiBase || global.env.API_BASE);

    global.file = (name?: string) => {
        if (typeof global.env.file !== 'function') {
            throw new Error('File content API is not available. Please provide it to the console');
        }
        return global.env.file(name);
    };

    global.contract = () => global.env.file();
    global.keyPair = (seed?: string) => wt.libs.crypto.keyPair(seed || envSeed());
    global.publicKey = (seed?: string) => wt.libs.crypto.keyPair(seed || envSeed()).publicKey;
    global.privateKey = (seed?: string) => wt.libs.crypto.keyPair(seed || envSeed()).privateKey;
    global.address = (seed?: string, chainId?: string) => wt.libs.crypto.address(seed || envSeed(), chainId || global.env.CHAIN_ID);
    global.compile = (code: string) => {
        const resultOrError = cmpl(code);
        if ('error' in resultOrError) throw new Error(resultOrError.error);

        return resultOrError.result.base64;
    };

    global.invoke = ({dApp, functionName, arguments: argsOpt, payment: paymentOpt}: IInvokeOptions, seed?: string, apiBase?: string) => {
        let payment: IPayment[] = [];
        if (typeof paymentOpt === 'number') payment = [{assetId: null, amount: paymentOpt}];
        if (typeof paymentOpt === 'object' && !Array.isArray(paymentOpt)) payment = [paymentOpt];
        if (typeof paymentOpt === 'object' && Array.isArray(paymentOpt)) payment = paymentOpt;

        const isIInvokeArgument = (arg: any): arg is IInvokeArgument =>
            typeof arg === 'object' && 'type' in arg && 'value' in arg;

        const decoder = new TextDecoder('utf8');
        const args: IInvokeArgument[] = (argsOpt || []).map((arg) => {
            //number
            if (typeof arg === 'number') return {type: 'integer', value: arg};
            //string
            if (typeof arg === 'string') return {type: 'string', value: arg};
            //boolean
            if (typeof arg === 'boolean') return {type: 'boolean', value: arg};
            //IInvokeArgument
            if (isIInvokeArgument(arg)) return arg;
            //Uint8Array
            if (typeof arg === 'object' && !Array.isArray(arg)) {
                return {type: 'binary', value: btoa(decoder.decode(arg as Uint8Array))};
            }
            //number[]
            if (typeof arg === 'object' && Array.isArray(arg) && arg.length > 0 && typeof arg[0] === 'number') {
                return {type: 'binary', value: btoa(decoder.decode(Uint8Array.from(arg)))};
            }
            return null;
        }).filter((v): v is IInvokeArgument => v != null);
        const params = {dApp, feeAssetId: null, call: {function: functionName, args}, payment};
        const tx = global.invokeScript(params, seed || envSeed());
        return global.broadcast(tx, apiBase || global.env.API_BASE);
    };

    global.signBytes = (bytes: Uint8Array, seed?: string) =>
        wt.libs.crypto.signBytes(bytes, seed || envSeed());

    const setupAccountsFunc = async (balances: Record<string, number>, options?: any): Promise<Record<string, string>> => {
        if (!global.accounts) global.accounts = {};

        const getNonce = () => [].map.call(
            wt.libs.crypto.randomBytes(4),
            (n: number) => n.toString(16))
            .join('');

        const nonce = (options && options.nonce) || getNonce();
        const masterSeed = (options && options.masterSeed) || envSeed();

        global.console.log(`Generating accounts with nonce: ${nonce}`);

        const transfers: IMassTransferItem[] = [];

        Object.entries(balances).forEach(([name, balance]) => {
            const seed = name + '#' + nonce;
            const addr = wt.libs.crypto.address(seed, global.env.CHAIN_ID);

            global.accounts[name] = seed;
            global.console.log(`Account generated: ${seed} - ${addr}`);
            transfers.push({
                recipient: addr,
                amount: balance
            });
        });

        const totalAmount = transfers.reduce((acc, {amount}) => acc + +amount, 0);
        if (totalAmount > 0) {
            const mtt = global.massTransfer({transfers}, masterSeed);
            await global.broadcast(mtt);
            await global.waitForTx(mtt.id);
            global.console.log(`Accounts successfully funded`);
        }

        return {...global.accounts};
    };

    global.setupAccounts = options && options.setupAccountsWrapper
        ? options.setupAccountsWrapper(setupAccountsFunc)
        : setupAccountsFunc

}

export interface IPayment {
    assetId?: string | null
    amount: number
}

export interface IPayment {
    assetId?: string | null
    amount: number
}

interface IInvokeArgument {
    /**
     * possible values:   "string" | "number" | "binary" | "boolean"
     */
    type: string,
    value: string | number | boolean
}

export interface IInvokeOptions {
    dApp: string
    functionName: string
    arguments?: (number | string | boolean | Uint8Array | number[] | IInvokeArgument)[]
    payment?: IPayment | IPayment[] | number
}
