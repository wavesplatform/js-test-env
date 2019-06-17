interface IEnv {
    accounts: Record<string, string>
    API_BASE: string
    CHAIN_ID: string
    SEED: string
    isScripted?: boolean
    file: (name?: string) => Promise<string>
}

declare namespace NodeJS {
    interface Global {
        env: IEnv
    }
}