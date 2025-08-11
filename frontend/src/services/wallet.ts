import { aptosService } from './aptos';
import { useAppStore } from '../stores/appStore';

export interface Wallet {
  connect(): Promise<void>;
  account(): Promise<string>;
  publicKey(): Promise<string>;
  signAndSubmitTransaction(payload: unknown): Promise<{ hash: string }>;
  signMessage(message: string): Promise<string>;
}

export interface WalletAccount {
  address: string;
  publicKey: string;
}

export class WalletService {
  
  // Check if wallet is available
  async checkWalletAvailability(): Promise<boolean> {
    try {
      // Check for common Aptos wallets
      const hasPetra = typeof window !== 'undefined' && 'aptos' in window;
      const hasPontem = typeof window !== 'undefined' && 'pontem' in window;
      
      return hasPetra || hasPontem;
    } catch (error) {
      console.error('Failed to check wallet availability:', error);
      return false;
    }
  }

  // Connect to wallet
  async connectWallet(): Promise<boolean> {
    try {
      useAppStore.getState().setLoading(true);
      
      // Check if wallet is available
      const isAvailable = await this.checkWalletAvailability();
      if (!isAvailable) {
        throw new Error('No Aptos wallet found. Please install Petra or Pontem wallet.');
      }

      // Try to connect to wallet
      const wallet = await this.getWallet();
      if (!wallet) {
        throw new Error('Failed to connect to wallet');
      }

      // Get account info
      const account = await this.getAccountInfo(wallet);
      if (!account) {
        throw new Error('Failed to get account information');
      }

      // Update store
      useAppStore.getState().connectWallet(account);
      
      // Initialize Aptos service
      await aptosService.initialize();
      aptosService.setAccount(account);

      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      useAppStore.getState().setError(error instanceof Error ? error.message : 'Failed to connect wallet');
      return false;
    } finally {
      useAppStore.getState().setLoading(false);
    }
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<void> {
    try {
      // Clear Aptos service
      aptosService.setAccount(null);
      
      // Update store
      useAppStore.getState().disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }

  // Get wallet instance
  private async getWallet(): Promise<Wallet | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    // Try Petra first
    if ('aptos' in window) {
      return (window as Window & { aptos: Wallet }).aptos;
    }

    // Try Pontem
    if ('pontem' in window) {
      return (window as Window & { pontem: Wallet }).pontem;
    }

    return null;
  }

  // Get account information from wallet
  private async getAccountInfo(wallet: Wallet): Promise<WalletAccount> {
    try {
      // Request account connection
      await wallet.connect();
      
      // Get account address
      const address = await wallet.account();
      
      // Get public key
      const publicKey = await wallet.publicKey();
      
      return {
        address,
        publicKey,
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  // Sign and submit transaction
  async submitTransaction(payload: unknown): Promise<{ hash: string }> {
    try {
      useAppStore.getState().setLoading(true);
      
      const wallet = await this.getWallet();
      if (!wallet) {
        throw new Error('No wallet connected');
      }

      // Submit transaction through wallet
      const result = await wallet.signAndSubmitTransaction(payload);
      
      // Add success notification
      useAppStore.getState().addNotification({
        type: 'success',
        title: 'Transaction Submitted',
        message: `Transaction submitted successfully. Hash: ${result.hash.slice(0, 8)}...`,
      });

      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      useAppStore.getState().setError(error instanceof Error ? error.message : 'Transaction failed');
      throw error;
    } finally {
      useAppStore.getState().setLoading(false);
    }
  }

  // Sign message
  async signMessage(message: string): Promise<string> {
    try {
      const wallet = await this.getWallet();
      if (!wallet) {
        throw new Error('No wallet connected');
      }

      const signature = await wallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance(address: string): Promise<number> {
    try {
      const balance = await aptosService.getAccountBalance(address);
      
      // Note: User balance will be updated when wallet reconnects
      return balance;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return 0;
    }
  }

  // Check if user is admin
  async checkAdminStatus(): Promise<boolean> {
    try {
      // TODO: Implement admin check from governance contract
      // For now, return false
      return false;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const walletService = new WalletService(); 