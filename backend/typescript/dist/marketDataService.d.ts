export interface NormalizedAsset {
    asset: string;
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    source: string;
    lastUpdated: number;
    symbol: string;
    name?: string;
    high24h?: number;
    low24h?: number;
    open24h?: number;
}
export interface MarketDataResponse {
    tradfi: NormalizedAsset[];
    defi: NormalizedAsset[];
    timestamp: number;
    dataSources: string[];
    errors: string[];
}
export interface TradFiAsset {
    symbol: string;
    price: number;
    change: number;
    volume: number;
    marketCap: number;
    high: number;
    low: number;
    open: number;
    name?: string;
}
export interface CryptoAsset {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_24h: number;
    total_volume: number;
    market_cap: number;
    high_24h?: number;
    low_24h?: number;
}
export interface DeFiProtocol {
    name: string;
    symbol: string;
    tvl: number;
    change_1d: number;
    volume_1d?: number;
    market_cap?: number;
}
export declare class MarketDataService {
    private cache;
    private readonly POLLING_INTERVAL;
    private isPolling;
    private pollingInterval;
    constructor();
    /**
     * Get all market data (TradFi + DeFi) with fallback logic
     */
    getAllMarketData(): Promise<MarketDataResponse>;
    /**
     * Get TradFi market data with fallback logic
     */
    getTradFiData(): Promise<NormalizedAsset[]>;
    /**
     * Get DeFi market data with fallback logic
     */
    getDeFiData(): Promise<NormalizedAsset[]>;
    /**
     * Start polling for real-time updates
     */
    startPolling(callback?: (data: MarketDataResponse) => void): void;
    /**
     * Stop polling
     */
    stopPolling(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
        hitRate: number;
    };
    /**
     * Clear cache
     */
    clearCache(): void;
    private fetchFromFinnhub;
    private fetchFromPolygon;
    private fetchFromAlphaVantage;
    private fetchFromTwelveData;
    private fetchFromCoinGecko;
    private fetchFromDefiLlama;
    private fetchFromBinance;
    /**
     * Fetch TradFi data from multiple APIs
     */
    private fetchTradFiDataFromAPIs;
    /**
     * Fetch DeFi data from multiple APIs
     */
    private fetchDeFiDataFromAPIs;
    /**
     * Get cached data if available and not expired
     */
    private getCachedData;
    /**
     * Return empty TradFi data to indicate API failure
     */
    private getEmptyTradFiData;
    /**
     * Return empty DeFi data to indicate API failure
     */
    private getEmptyDeFiData;
    private getActiveDataSources;
    private cacheData;
    private calculateCacheHitRate;
    private setupAxiosInterceptors;
}
export declare const marketDataService: MarketDataService;
export declare const getMarketData: () => Promise<MarketDataResponse>;
export declare const getTradFiData: () => Promise<NormalizedAsset[]>;
export declare const getDeFiData: () => Promise<NormalizedAsset[]>;
export declare const startMarketDataPolling: (callback?: (data: MarketDataResponse) => void) => void;
export declare const stopMarketDataPolling: () => void;
//# sourceMappingURL=marketDataService.d.ts.map