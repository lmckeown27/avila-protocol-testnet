import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AptosAccount } from '../services/aptos';

// Types
export interface User {
  address: string;
  publicKey: string;
  balance: number;
  isAdmin: boolean;
}

export interface Asset {
  ticker: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  decimals: number;
}

export interface Position {
  id: string;
  seriesId: number;
  type: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  margin: number;
}

export interface Order {
  id: string;
  seriesId: number;
  type: 'bid' | 'ask';
  price: number;
  quantity: number;
  filled: number;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

// Store interface
interface AppState {
  // Wallet state
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Assets and markets
  assets: Asset[];
  selectedAsset: Asset | null;
  
  // User positions and orders
  positions: Position[];
  orders: Order[];
  
  // UI state
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  connectWallet: (account: AptosAccount) => void;
  disconnectWallet: () => void;
  setAssets: (assets: Asset[]) => void;
  setSelectedAsset: (asset: Asset | null) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Store implementation
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isConnected: false,
      isConnecting: false,
      assets: [],
      selectedAsset: null,
      positions: [],
      orders: [],
      notifications: [],
      isLoading: false,
      error: null,

      // Actions
      connectWallet: (account: AptosAccount) => {
        const user: User = {
          address: account.address,
          publicKey: account.publicKey,
          balance: 0,
          isAdmin: false, // TODO: Check admin status from contract
        };
        
        set({
          user,
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        
        // Add success notification
        get().addNotification({
          type: 'success',
          title: 'Wallet Connected',
          message: `Successfully connected to ${account.address.slice(0, 6)}...${account.address.slice(-4)}`,
        });
      },

      disconnectWallet: () => {
        set({
          user: null,
          isConnected: false,
          isConnecting: false,
          positions: [],
          orders: [],
          error: null,
        });
        
        // Add info notification
        get().addNotification({
          type: 'info',
          title: 'Wallet Disconnected',
          message: 'You have been disconnected from your wallet',
        });
      },

      setAssets: (assets: Asset[]) => {
        set({ assets });
      },

      setSelectedAsset: (asset: Asset | null) => {
        set({ selectedAsset: asset });
      },

      addPosition: (position: Position) => {
        set((state) => ({
          positions: [...state.positions, position],
        }));
      },

      updatePosition: (id: string, updates: Partial<Position>) => {
        set((state) => ({
          positions: state.positions.map((pos) =>
            pos.id === id ? { ...pos, ...updates } : pos
          ),
        }));
      },

      removePosition: (id: string) => {
        set((state) => ({
          positions: state.positions.filter((pos) => pos.id !== id),
        }));
      },

      addOrder: (order: Order) => {
        set((state) => ({
          orders: [...state.orders, order],
        }));
      },

      updateOrder: (id: string, updates: Partial<Order>) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, ...updates } : order
          ),
        }));
      },

      removeOrder: (id: string) => {
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        }));
      },

      addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: Date.now(),
        };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));
        
        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, 5000);
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        if (error) {
          set({ error });
          
          // Add error notification
          get().addNotification({
            type: 'error',
            title: 'Error',
            message: error,
          });
        } else {
          set({ error: null });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'avila-protocol-store',
      partialize: (state) => ({
        user: state.user,
        isConnected: state.isConnected,
        assets: state.assets,
        selectedAsset: state.selectedAsset,
      }),
    }
  )
); 