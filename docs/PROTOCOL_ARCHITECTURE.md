# Avila Protocol: TradFi-Style European Options Protocol

## Overview

The Avila Protocol is a comprehensive, on-chain European options trading protocol built on Aptos using Move. It implements traditional finance (TradFi) standards for options trading with blockchain-native features for security, transparency, and efficiency.

## Core Principles

### European-Style Options
- **Exercise at Expiry Only**: Options can only be exercised at or after the expiration date
- **No Early Exercise**: Prevents American-style early exercise, ensuring predictable cash flows
- **Standardized Series**: All options in a series have identical terms (strike, expiry, underlying)

### On-Chain Security
- **Reentrancy Protection**: Built-in safeguards against reentrancy attacks
- **Access Control**: Admin-only functions for critical operations
- **Input Validation**: Comprehensive parameter validation and bounds checking
- **Event Emission**: Full audit trail of all protocol operations

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OptionsCore   │    │   OrderBook     │    │ MarginEngine    │
│                 │    │                 │    │                 │
│ • Series Mgmt   │    │ • Order Mgmt    │    │ • Risk Calc     │
│ • Exercise      │    │ • Matching      │    │ • Margin Req    │
│ • Settlement    │    │ • Cancellation  │    │ • Liquidation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ CollateralVault │    │PriceOracleAdapter│    │  Integration   │
│                 │    │                 │    │     Tests      │
│ • Collateral    │    │ • Price Feeds   │    │ • End-to-End   │
│ • Lock/Release  │    │ • TWAP Calc     │    │ • Validation   │
│ • Vault Mgmt    │    │ • Settlement    │    │ • Scenarios    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Module Details

### 1. OptionsCore

The central module managing option series, positions, and lifecycle events.

#### Key Structures
```move
struct OptionSeries {
    id: u64,
    underlying_asset: address,      // Token address
    strike_price: u128,             // Strike price in quote currency
    expiry: u64,                    // Unix timestamp
    option_type: u8,                // 0 = CALL, 1 = PUT
    contract_size: u64,             // Shares per contract
    settlement_style: u8,           // 0 = cash, 1 = physical
    issuer: address,                // Issuer reference
    total_supply: u64,              // Total contracts minted
    is_active: bool,                // Series status
    created_at: u64,                // Creation timestamp
}
```

#### Core Functions
- `create_series()`: Create new standardized option series (admin only)
- `buy_option()`: Purchase options and create long positions
- `write_option()`: Sell options and create short positions
- `exercise()`: Exercise options at expiry (European-style)
- `settle_expired_series()`: Clean up expired series

#### European-Style Enforcement
```move
// Exercise only allowed at or after expiry
assert!(is_series_expired(series), E_NOT_EXPIRED);
```

### 2. OrderBook

Manages limit orders, market making, and order matching.

#### Key Structures
```move
struct Order {
    id: u64,
    series_id: u64,
    maker: address,
    order_type: u8,                 // 0 = limit, 1 = market
    side: u8,                       // 0 = bid, 1 = ask
    price: u128,
    quantity: u64,
    remaining_quantity: u64,
    status: u8,                     // Order status tracking
    timestamp: u64,
    filled_quantity: u64,
    average_fill_price: u128,
}
```

#### Core Functions
- `place_order()`: Submit new orders to the book
- `cancel_order()`: Cancel existing orders
- `match_orders()`: Execute order matching (batch processing)

### 3. MarginEngine

Implements SPAN-style portfolio margin calculations and risk management.

#### Key Structures
```move
struct PortfolioPosition {
    series_id: u64,
    position_type: u8,              // 0 = long, 1 = short
    quantity: i128,                 // Signed position size
    entry_price: u128,
    current_price: u128,
    unrealized_pnl: i128,
    margin_required: u128,
    created_at: u64,
    last_updated: u64,
}

struct AccountMargin {
    account: address,
    total_margin: u128,
    used_margin: u128,
    available_margin: u128,
    initial_margin_required: u128,
    maintenance_margin_required: u128,
    margin_excess: u128,
    risk_level: u8,
    last_updated: u64,
}
```

#### Core Functions
- `compute_account_margin()`: Calculate margin requirements
- `require_sufficient_margin()`: Enforce margin requirements
- `register_position()`: Track portfolio positions
- `check_and_trigger_liquidation()`: Monitor liquidation thresholds

#### Margin Constants
```move
const INITIAL_MARGIN_MULTIPLIER: u64 = 150;    // 150% initial margin
const MAINTENANCE_MARGIN_MULTIPLIER: u64 = 120; // 120% maintenance margin
const LIQUIDATION_THRESHOLD: u64 = 110;        // 110% of maintenance margin
```

### 4. CollateralVault

Manages collateral deposits, locks, and releases for option writers.

#### Key Structures
```move
struct Vault {
    owner: address,
    collateral_token: address,
    deposited_amount: u128,
    locked_amount: u128,
    available_amount: u128,
    status: u8,
    created_at: u64,
    last_updated: u64,
}

struct CollateralLock {
    lock_id: u64,
    owner: address,
    series_id: u64,
    amount: u128,
    lock_type: u8,                  // 0 = position, 1 = margin
    created_at: u64,
    expires_at: u64,
}
```

#### Core Functions
- `deposit_collateral()`: Add collateral to vault
- `lock_for_position()`: Lock collateral for option writing
- `release_after_settlement()`: Release locked collateral
- `force_liquidate()`: Emergency liquidation (margin engine)

### 5. PriceOracleAdapter

Provides authenticated price feeds with time-weighting and staleness checks.

#### Key Structures
```move
struct PriceFeed {
    asset: address,
    price: u128,
    timestamp: u64,
    status: u8,
    oracle_type: u8,                // 0 = Chainlink, 1 = Pyth, 2 = Custom
    oracle_address: address,
    confidence_interval: u128,
    last_updated: u64,
}

struct SettlementPrice {
    series_id: u64,
    asset: address,
    settlement_price: u128,
    settlement_timestamp: u64,
    twap_price: u128,               // Time-weighted average price
    twap_window: u64,
    is_settled: bool,
}
```

#### Core Functions
- `update_price_feed()`: Update prices from whitelisted oracles
- `get_current_price()`: Retrieve current price with staleness check
- `get_twap_price()`: Calculate time-weighted average price
- `set_settlement_price()`: Set final settlement price at expiry

#### Oracle Security
```move
// Only whitelisted oracles can update prices
assert!(exists<OracleWhitelist>(oracle_addr), E_ORACLE_NOT_WHITELISTED);

// Price staleness check (5 minutes default)
const MAX_STALENESS_SECONDS: u64 = 300;
```

## Usage Patterns

### 1. Creating Option Series

```move
// Admin creates standardized series
let series_id = options_core::create_series(
    &admin,
    underlying_asset,
    strike_price,
    expiry_days,
    option_type,
    contract_size,
    settlement_style,
    issuer
);
```

### 2. Trading Options

```move
// User writes (sells) options
let short_position = options_core::write_option(
    &writer,
    series_id,
    quantity,
    premium_received,
    collateral_required
);

// User buys options
let long_position = options_core::buy_option(
    &buyer,
    series_id,
    quantity,
    premium_paid
);
```

### 3. Order Management

```move
// Place limit order
let order_id = order_book::place_order(
    &maker,
    series_id,
    is_bid,
    price,
    quantity
);

// Cancel order
order_book::cancel_order(&maker, order_id);
```

### 4. Margin Management

```move
// Check margin requirements
let (initial_req, maintenance_req) = margin_engine::compute_account_margin(account);

// Register position
margin_engine::register_position(account, series_id, quantity);
```

### 5. Exercise and Settlement

```move
// Exercise at expiry (European-style)
let payout = options_core::exercise(&holder, series_id, quantity);

// Settle expired series
options_core::settle_expired_series(&admin, series_id);
```

## Security Features

### Access Control
- **Admin Functions**: Series creation, oracle whitelisting, settlement
- **User Functions**: Trading, order management, exercise
- **Oracle Functions**: Price updates (whitelisted only)

### Input Validation
- **Price Bounds**: Min/max price validation
- **Quantity Limits**: Contract size and order size bounds
- **Time Validation**: Expiry date validation
- **Parameter Ranges**: Strike price, contract size limits

### Reentrancy Protection
- **State Checks**: Verify state before operations
- **Event Emission**: Audit trail for all operations
- **Atomic Operations**: Single transaction execution

## Risk Management

### Margin Requirements
- **Initial Margin**: 150% of position value
- **Maintenance Margin**: 120% of position value
- **Liquidation Threshold**: 110% of maintenance margin

### Position Limits
- **Maximum Leverage**: 10x leverage cap
- **Order Size Limits**: Min/max order size constraints
- **Series Limits**: Maximum contracts per series

### Oracle Security
- **Whitelist Management**: Only approved oracles
- **Staleness Checks**: Reject stale prices
- **Confidence Intervals**: Price accuracy validation

## Testing and Validation

### Integration Tests
- **End-to-End Scenarios**: Complete option lifecycle
- **Error Handling**: Invalid input validation
- **Edge Cases**: Boundary condition testing
- **Protocol Statistics**: State verification

### Test Coverage
- **Unit Tests**: Individual module functionality
- **Integration Tests**: Cross-module interactions
- **Stress Tests**: High-volume scenarios
- **Security Tests**: Access control validation

## Deployment Considerations

### Network Selection
- **Mainnet**: Production deployment
- **Testnet**: Testing and validation
- **Devnet**: Development and debugging

### Gas Optimization
- **Batch Operations**: Group related operations
- **Efficient Storage**: Optimize data structures
- **Minimal State Changes**: Reduce storage costs

### Monitoring
- **Event Logging**: Track all operations
- **State Monitoring**: Protocol health checks
- **Performance Metrics**: Gas usage and throughput

## Future Enhancements

### Planned Features
- **Multi-Asset Support**: Additional underlying assets
- **Advanced Greeks**: Delta, gamma, theta calculations
- **Portfolio Margining**: Cross-position risk offsetting
- **Liquidity Pools**: Automated market making

### Scalability Improvements
- **Layer 2 Integration**: Off-chain order matching
- **Sharding**: Parallel processing capabilities
- **Cross-Chain**: Multi-chain interoperability

## Conclusion

The Avila Protocol provides a robust, secure, and efficient foundation for on-chain European options trading. By implementing TradFi standards with blockchain-native features, it offers the best of both worlds: familiar trading mechanics with enhanced transparency and security.

The modular architecture allows for easy upgrades and extensions while maintaining strict security standards. The comprehensive testing suite ensures reliability and correctness across all use cases. 