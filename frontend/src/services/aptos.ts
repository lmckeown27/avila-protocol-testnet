import { config } from '../config/environment';

export interface AptosAccount {
  address: string;
  publicKey: string;
}

export interface TransactionPayload {
  function: string;
  type_arguments: string[];
  arguments: (string | number | boolean)[];
}

export interface AccountInfo {
  sequence_number: string;
  authentication_key: string;
  [key: string]: unknown;
}

export interface AccountResource {
  data: {
    coin?: {
      value: string;
    };
    [key: string]: unknown;
  };
}

export class AptosService {
  private account: AptosAccount | null = null;
  private nodeUrl: string;

  constructor() {
    this.nodeUrl = config.aptos.nodeUrl;
  }

  // Initialize Aptos client
  async initialize() {
    try {
      // Test connection by fetching ledger info
      const response = await fetch(`${this.nodeUrl}/v1`);
      if (response.ok) {
        console.log('✅ Connected to Aptos testnet');
        return true;
      } else {
        throw new Error('Failed to connect to Aptos node');
      }
    } catch (error) {
      console.error('Failed to connect to Aptos:', error);
      return false;
    }
  }

  // Set account (called after wallet connection)
  setAccount(account: AptosAccount | null) {
    this.account = account;
  }

  // Get current account
  getAccount(): AptosAccount | null {
    return this.account;
  }

  // Get account info via REST API
  async getAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const response = await fetch(`${this.nodeUrl}/v1/accounts/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  // Get account balance via REST API
  async getAccountBalance(address: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.nodeUrl}/v1/accounts/${address}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`
      );
      if (!response.ok) {
        return 0;
      }
      const data: AccountResource = await response.json();
      return data.data?.coin?.value ? parseInt(data.data.coin.value) : 0;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return 0;
    }
  }

  // Create entry function payload
  createEntryFunctionPayload(
    moduleAddress: string,
    moduleName: string,
    functionName: string,
    typeArgs: string[] = [],
    args: (string | number | boolean)[] = []
  ): TransactionPayload {
    return {
      function: `${moduleAddress}::${moduleName}::${functionName}`,
      type_arguments: typeArgs,
      arguments: args,
    };
  }

  // Helper method to convert address format
  normalizeAddress(address: string): string {
    if (address.startsWith('0x')) {
      return address;
    }
    return `0x${address}`;
  }

  // Get testnet faucet URL
  getFaucetUrl(): string {
    return config.aptos.faucetUrl;
  }

  // Check if connected to testnet
  isTestnet(): boolean {
    return this.nodeUrl.includes('testnet');
  }

  // Get node URL
  getNodeUrl(): string {
    return this.nodeUrl;
  }
}

// Export singleton instance
export const aptosService = new AptosService(); 