"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCALING_LEVELS = exports.CURRENT_SCALING_LEVEL = void 0;
exports.getCurrentLevel = getCurrentLevel;
exports.getNextLevel = getNextLevel;
exports.getPreviousLevel = getPreviousLevel;
exports.updateScalingLevel = updateScalingLevel;
exports.CURRENT_SCALING_LEVEL = {
    stocks: {
        count: 5,
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
        description: 'MINIMAL - Top 5 US stocks for initial testing'
    },
    etfs: {
        count: 3,
        symbols: ['SPY', 'QQQ', 'VTI'],
        description: 'MINIMAL - Top 3 major ETFs for initial testing'
    },
    crypto: {
        count: 5,
        symbols: ['BTC', 'ETH', 'USDT', 'USDC', 'BNB'],
        description: 'MINIMAL - Top 5 crypto assets for initial testing'
    },
    discovery: {
        stocksTarget: 10,
        etfsTarget: 5,
        cryptoTarget: 10,
        description: 'MINIMAL - Discovery targets for initial testing'
    },
    notes: `
    SCALING LEVEL: MINIMAL (STARTING POINT)
    
    This configuration starts with the absolute minimum assets to ensure
    frontend-backend integration works perfectly.
    
    NEXT STEPS:
    1. Test this configuration - ensure frontend displays data correctly
    2. If successful, increase to SMALL level (+5 stocks, +2 ETFs, +5 crypto)
    3. Test again and document any issues
    4. Continue scaling up incrementally
    
    MONITORING:
    - Watch for API rate limit errors
    - Monitor frontend loading times
    - Check for data display issues
    - Note any backend timeouts or crashes
  `
};
exports.SCALING_LEVELS = {
    MINIMAL: exports.CURRENT_SCALING_LEVEL,
    SMALL: {
        stocks: { count: 10, symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JNJ', 'PG'], description: 'SMALL - Top 10 US stocks' },
        etfs: { count: 5, symbols: ['SPY', 'QQQ', 'VTI', 'VEA', 'VWO'], description: 'SMALL - Top 5 major ETFs' },
        crypto: { count: 10, symbols: ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'AVAX', 'DOT'], description: 'SMALL - Top 10 crypto assets' },
        discovery: { stocksTarget: 20, etfsTarget: 10, cryptoTarget: 20, description: 'SMALL - Discovery targets' },
        notes: 'SMALL - Next level after MINIMAL is confirmed working'
    },
    MEDIUM: {
        stocks: { count: 25, symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JNJ', 'PG', 'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC', 'HD', 'UNH', 'MA', 'V', 'DIS', 'PYPL'], description: 'MEDIUM - Top 25 US stocks' },
        etfs: { count: 15, symbols: ['SPY', 'QQQ', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', 'SLV', 'USO', 'TLT', 'LQD', 'HYG', 'EMB', 'EFA', 'EEM'], description: 'MEDIUM - Top 15 major ETFs' },
        crypto: { count: 25, symbols: ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'LTC', 'BCH', 'XLM', 'ATOM', 'ETC', 'FIL', 'VET', 'TRX', 'THETA', 'XMR', 'EOS', 'AAVE'], description: 'MEDIUM - Top 25 crypto assets' },
        discovery: { stocksTarget: 50, etfsTarget: 25, cryptoTarget: 50, description: 'MEDIUM - Discovery targets' },
        notes: 'MEDIUM - After SMALL is confirmed working'
    },
    LARGE: {
        stocks: { count: 50, symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JNJ', 'PG', 'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC', 'HD', 'UNH', 'MA', 'V', 'DIS', 'PYPL', 'ADBE', 'CRM', 'INTC', 'ORCL', 'ABT', 'LLY', 'PEP', 'AVGO', 'TMO', 'COST', 'DHR', 'NEE', 'ACN', 'WMT', 'MRK', 'QCOM', 'TXN', 'HON', 'LOW', 'UPS', 'SPGI', 'RTX', 'IBM', 'AMAT', 'PLD', 'SCHW', 'GILD', 'BKNG', 'ADI'], description: 'LARGE - Top 50 US stocks' },
        etfs: { count: 30, symbols: ['SPY', 'QQQ', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', 'SLV', 'USO', 'TLT', 'LQD', 'HYG', 'EMB', 'EFA', 'EEM', 'AGG', 'TIP', 'SHY', 'IEI', 'VGK', 'VPL', 'VSS', 'VCSH', 'VCIT', 'VGSH', 'VTEB', 'VWOB', 'VXUS', 'VYM', 'VIG'], description: 'LARGE - Top 30 major ETFs' },
        crypto: { count: 50, symbols: ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'LTC', 'BCH', 'XLM', 'ATOM', 'ETC', 'FIL', 'VET', 'TRX', 'THETA', 'XMR', 'EOS', 'AAVE', 'ALGO', 'MKR', 'COMP', 'SUSHI', 'YFI', 'SNX', 'BAL', 'REN', 'BAND', 'ZRX', 'BAT', 'MANA', 'ENJ', 'SAND', 'AXS', 'CHZ', 'HOT', 'DOGE', 'SHIB', 'TRX', 'THETA', 'XMR', 'EOS', 'AAVE', 'ALGO', 'MKR', 'COMP'], description: 'LARGE - Top 50 crypto assets' },
        discovery: { stocksTarget: 100, etfsTarget: 50, cryptoTarget: 100, description: 'LARGE - Discovery targets' },
        notes: 'LARGE - After MEDIUM is confirmed working'
    }
};
function getCurrentLevel() {
    return exports.CURRENT_SCALING_LEVEL;
}
function getNextLevel(currentLevel) {
    const levels = Object.keys(exports.SCALING_LEVELS);
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex === -1 || currentIndex === levels.length - 1) {
        return null;
    }
    return exports.SCALING_LEVELS[levels[currentIndex + 1]];
}
function getPreviousLevel(currentLevel) {
    const levels = Object.keys(exports.SCALING_LEVELS);
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex <= 0) {
        return null;
    }
    return exports.SCALING_LEVELS[levels[currentIndex - 1]];
}
function updateScalingLevel(newLevel) {
    console.log('🔄 Updating scaling level to:', newLevel);
}
