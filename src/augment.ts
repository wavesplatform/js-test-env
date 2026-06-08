import * as wt from '@waves/waves-transactions';
import { compile as cmpl } from '@waves/ride-js';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { MassTransferItem } from '@waves/ts-types';
import type { INodeRequestOptions } from '@waves/node-api-js/cjs/nodeInteraction';
import * as nodeInteraction from '@waves/node-api-js/cjs/nodeInteraction';
import * as transactionsNodeApi from '@waves/node-api-js/cjs/api-node/transactions';
import * as addressesNodeApi from '@waves/node-api-js/cjs/api-node/addresses';
import * as assetsNodeApi from '@waves/node-api-js/cjs/api-node/assets';

chai.use(chaiAsPromised);

const NO_SEED_MSG = `Seed is undefined. Please check that you have seed in your config file or web ide settings`;

export type TSetupAccountsFunc = (balances: Record<string, number>, options?: {masterSeed: string, nonce: string}) =>
    Promise<Record<string, string>>

export interface IAugmentOptions  {
    broadcastWrapper?: (f: (tx: wt.TTx, apiBase?: string, requestOptions?: RequestInit) => Promise<wt.TTx>) =>
        (tx: wt.TTx, apiBase?: string, requestOptions?: RequestInit) => Promise<wt.TTx>
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

    const broadcastViaNodeApi = (tx: wt.TTx, apiBase?: string, requestOptions?: RequestInit) =>
        transactionsNodeApi.broadcast(apiBase || global.env.API_BASE, tx, requestOptions || global.env.requestOptions) as Promise<wt.TTx>;

    global.accounts = {}
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
    global.updateAssetInfo = injectEnv(wt.updateAssetInfo);

    global.waitForTx = async (txId: string, options?: INodeRequestOptions, requestOptions?: RequestInit) =>
        nodeInteraction.waitForTx(txId, withDefaults(options), requestOptions || global.env.requestOptions);
    global.waitForTxWithNConfirmations = async (txId: string, confirmations: number, options?: INodeRequestOptions, requestOptions?: RequestInit) =>
        nodeInteraction.waitForTxWithNConfirmations(txId, confirmations, withDefaults(options), requestOptions || global.env.requestOptions);
    global.waitNBlocks = (blocksCount: number, options?: INodeRequestOptions, requestOptions?: RequestInit) =>
        nodeInteraction.waitNBlocks(blocksCount, withDefaults(options), requestOptions || global.env.requestOptions);
    global.currentHeight = (apiBase?: string, requestOptions?: RequestInit) =>
        nodeInteraction.currentHeight(apiBase || global.env.API_BASE);
    global.transactionById = (txId: string, apiBase?: string, requestOptions?: RequestInit) =>
        transactionsNodeApi.fetchInfo(apiBase || global.env.API_BASE, txId, requestOptions || global.env.requestOptions);
    global.waitForHeight = (target: number, options?: INodeRequestOptions, requestOptions?: RequestInit) =>
        nodeInteraction.waitForHeight(target, withDefaults(options));
    global.balance = (address?: string, apiBase?: string, requestOptions?: RequestInit) =>
        addressesNodeApi.fetchBalance(apiBase || global.env.API_BASE, address || currentAddress(), requestOptions || global.env.requestOptions).then((r) => r.balance);
    global.assetBalance = (assetId: string, address?: string, apiBase?: string, requestOptions?: RequestInit) =>
        assetsNodeApi.fetchBalanceAddressAssetId(apiBase || global.env.API_BASE, address || currentAddress(), assetId, requestOptions || global.env.requestOptions)
            .then((r) => r.balance);
    global.balanceDetails = (address?: string, apiBase?: string, requestOptions?: RequestInit) =>
        addressesNodeApi.fetchBalanceDetails(apiBase || global.env.API_BASE, address || currentAddress(), requestOptions || global.env.requestOptions);
    global.accountData = (address?: string, apiBase?: string, requestOptions?: RequestInit) =>
        nodeInteraction.accountData(address || currentAddress(), apiBase || global.env.API_BASE, requestOptions || global.env.requestOptions);
    global.accountDataByKey = (key: string, address?: string, apiBase?: string, requestOptions?: RequestInit) =>
        nodeInteraction.accountDataByKey(key, address || currentAddress(), apiBase || global.env.API_BASE, requestOptions || global.env.requestOptions);
    global.stateChanges = (invokeScriptTxId: string, apiBase?: string, requestOptions?: RequestInit) =>
        nodeInteraction.stateChanges(invokeScriptTxId, apiBase || global.env.API_BASE, requestOptions || global.env.requestOptions);
    global.broadcast = (tx: wt.TTx, apiBase?: string, requestOptions?: RequestInit) => options && options.broadcastWrapper
        ? options.broadcastWrapper(broadcastViaNodeApi)(tx, apiBase || global.env.API_BASE, requestOptions || global.env.requestOptions)
        : broadcastViaNodeApi(tx, apiBase || global.env.API_BASE, requestOptions || global.env.requestOptions);

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
        const resultOrError = cmpl(code, 3);
        if ('error' in resultOrError) throw new Error(resultOrError.error);

        return resultOrError.result.base64;
    };

    global.invoke = ({dApp, functionName, arguments: argsOpt, payment: paymentOpt}: IInvokeOptions, seed?: string, apiBase?: string, requestOptions?: RequestInit) => {
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
        return global.broadcast(tx, apiBase || global.env.API_BASE, requestOptions);
    };

    global.signBytes = (bytes: Uint8Array, seed?: string) =>
        wt.libs.crypto.signBytes(bytes, seed || envSeed());

    const setupAccountsFunc = async (balances: Record<string, number>, options?: any, requestOptions?: RequestInit): Promise<Record<string, string>> => {
        if (!global.accounts) global.accounts = {};

        const getNonce = () => [].map.call(
            wt.libs.crypto.randomBytes(4),
            (n: number) => n.toString(16))
            .join('');

        const nonce = (options && options.nonce) || getNonce();
        const masterSeed = (options && options.masterSeed) || envSeed();

        global.console.log(`Generating accounts with nonce: ${nonce}`);

        const transfers: MassTransferItem[] = [];

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
            await global.broadcast(mtt, undefined, requestOptions);
            await global.waitForTx(mtt.id, undefined, requestOptions);
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

