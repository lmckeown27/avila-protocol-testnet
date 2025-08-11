# Smart Contract Architecture

## Overview

This document provides a detailed explanation of each smart contract in the Avila Protocol and how they work together to execute the complete options trading system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Avila Protocol                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Options   │  │   Order     │  │   Margin    │            │
│  │    Core     │  │   Book      │  │   Engine    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Collateral  │  │ Settlement  │  │   Price     │            │
│  │   Vault     │  │   Engine    │  │   Oracle    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Governance  │  │ Compliance  │  │   Events    │            │
│  │    Admin    │  │    Gate     │  │ & Auditing  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Core Smart Contracts

### 1. **Options Core** (`options_core.move`)

**Purpose**: The heart of the protocol that manages the complete lifecycle of options contracts.

**Key Functions**:
- `create_series()` - Creates new option series with defined parameters
- `buy_option()` - Mints long positions for option buyers
- `write_option()` - Creates short positions for option writers
- `exercise()` - **AMERICAN STYLE**: Allows early exercise at any time before expiry
- `settle_expired_series()` - Handles expired series cleanup

**Key Features**:
- **American-Style Options**: Early exercise capability (unlike European options)
- **Real-time Pricing**: Uses current market prices for immediate settlement
- **Position Management**: Tracks both long and short positions
- **Series Standardization**: Enforces consistent contract parameters

**Integration Points**:
- Calls `price_oracle_adapter::get_current_price()` for real-time pricing
- Integrates with `margin_engine` for collateral requirements
- Emits events for `events_and_auditing` tracking

---

### 2. **Order Book** (`order_book.move`)

**Purpose**: Central limit order book for efficient price discovery and trade execution.

**Key Functions**:
- `place_order()` - Places buy/sell orders in the order book
- `cancel_order()` - Cancels existing orders
- `match_orders()` - Executes matching orders automatically
- `get_order_book()` - Retrieves current order book state

**Key Features**:
- **Limit Orders**: Traditional limit order functionality
- **Market Orders**: Immediate execution at best available price
- **Order Matching**: Automated matching engine for efficient trades
- **Price Discovery**: Transparent price formation through order aggregation

**Integration Points**:
- Receives orders from `avila_protocol` main entry point
- Updates `options_core` positions after successful trades
- Integrates with `margin_engine` for position validation

---

### 3. **Margin Engine** (`margin_engine.move`)

**Purpose**: Advanced risk management and margin calculation system.

**Key Functions**:
- `calculate_position_margin()` - Standard margin calculations
- `calculate_american_option_margin()` - **American-specific margins** with early exercise risk
- `register_position()` - Tracks portfolio positions and risk exposure
- `check_margin_call()` - Monitors margin requirements and triggers calls

**Key Features**:
- **American Risk Factors**: Higher margins for early exercise scenarios
- **Time-based Adjustments**: Margin requirements increase as expiry approaches
- **Portfolio Risk**: Aggregates risk across multiple positions
- **Liquidation Protection**: Prevents excessive risk exposure

**Integration Points**:
- Called by `options_core` for position validation
- Integrates with `collateral_vault` for margin locking
- Provides risk data to `settlement_engine`

---

### 4. **Collateral Vault** (`collateral_vault.move`)

**Purpose**: Secure custody and management of user collateral and assets.

**Key Functions**:
- `deposit_collateral()` - Accepts user deposits
- `lock_collateral()` - Locks collateral for specific positions
- `release_collateral()` - Releases locked collateral after position closure
- `withdraw_collateral()` - Returns unused collateral to users

**Key Features**:
- **Position-based Locking**: Collateral locked per individual position
- **Multi-asset Support**: Handles various token types
- **Security**: Prevents double-spending of collateral
- **Transparency**: Clear tracking of all collateral movements

**Integration Points**:
- Called by `margin_engine` for collateral operations
- Integrates with `settlement_engine` for payout processing
- Provides collateral data to `events_and_auditing`

---

### 5. **Settlement Engine** (`settlement_engine.move`)

**Purpose**: Handles all options settlement and payout processing.

**Key Functions**:
- `settle_cash()` - Cash-settled options processing
- `settle_physical()` - Physically-settled options processing
- `handle_american_early_exercise()` - **American early exercise settlements**
- `process_payouts()` - Distributes settlement amounts to participants

**Key Features**:
- **Multiple Settlement Types**: Cash, physical, and American early exercise
- **Immediate Processing**: American options settle immediately upon exercise
- **Fee Management**: Different fee structures for various settlement types
- **Payout Tracking**: Comprehensive record of all settlements

**Integration Points**:
- Called by `options_core` for exercise processing
- Integrates with `collateral_vault` for asset transfers
- Updates `margin_engine` after position closures

---

### 6. **Price Oracle Adapter** (`price_oracle_adapter.move`)

**Purpose**: Provides real-time price feeds and market data for accurate pricing.

**Key Functions**:
- `get_current_price()` - **Real-time spot prices** for American options
- `get_settlement_price()` - Settlement prices for expired options
- `get_twap_price()` - Time-weighted average prices
- `update_price()` - Oracle price updates

**Key Features**:
- **Multi-oracle Support**: Chainlink, Pyth, and custom oracles
- **Price Validation**: Staleness checks and confidence intervals
- **TWAP Calculations**: Time-weighted pricing for settlement
- **Real-time Data**: Essential for American-style early exercise

**Integration Points**:
- Called by `options_core` for exercise pricing
- Provides data to `margin_engine` for risk calculations
- Integrates with `settlement_engine` for final settlement prices

---

### 7. **Governance Admin** (`governance_admin.move`)

**Purpose**: Protocol governance and parameter management.

**Key Functions**:
- `add_authorized_role()` - Grants administrative permissions
- `update_protocol_params()` - Modifies protocol parameters
- `pause_module()` - Emergency pause functionality
- `upgrade_protocol()` - Protocol upgrade management

**Key Features**:
- **Multi-role System**: Admin, Operator, and Guardian roles
- **Parameter Control**: Adjustable fees, limits, and settings
- **Emergency Controls**: Ability to pause operations if needed
- **Upgrade Path**: Controlled protocol evolution

**Integration Points**:
- Controls access to all other modules
- Manages protocol-wide parameters
- Integrates with `events_and_auditing` for governance tracking

---

### 8. **Compliance Gate** (`compliance_gate.move`)

**Purpose**: KYC/AML verification and regulatory compliance enforcement.

**Key Functions**:
- `verify_user_kyc()` - KYC verification process
- `whitelist_user()` - Adds verified users to whitelist
- `is_user_allowed_for_series()` - Checks user compliance status
- `revoke_access()` - Removes non-compliant users

**Key Features**:
- **KYC Verification**: Identity verification for regulatory compliance
- **Whitelist Management**: Controlled access to protocol features
- **Series-specific Access**: Different compliance levels per option series
- **Audit Trail**: Complete compliance history tracking

**Integration Points**:
- Called by `avila_protocol` before allowing trades
- Integrates with `events_and_auditing` for compliance logging
- Controls access to all trading functions

---

### 9. **Events & Auditing** (`events_and_auditing.move`)

**Purpose**: Comprehensive event emission and audit trail management.

**Key Functions**:
- `emit_series_created()` - Option series creation events
- `emit_trade_executed()` - Trade execution events
- `emit_american_early_exercise()` - **American early exercise events**
- `emit_settlement()` - Settlement completion events

**Key Features**:
- **Complete Event Coverage**: All protocol actions are logged
- **American Exercise Tracking**: Specialized events for early exercise
- **Audit Logs**: Searchable audit trail for compliance
- **Event Categorization**: Organized by event type for easy filtering

**Integration Points**:
- Called by all other modules for event emission
- Provides data for external monitoring and compliance
- Enables complete protocol transparency

---

### 10. **MultiStock Mock** (`multi_stock_mock.move`)

**Purpose**: Provides mock tokenized stocks and price oracle data for testing the options protocol.

**Key Functions**:
- `register_stock()` - Registers new mock stock with ticker, name, and decimals
- `mint()` - Mints mock tokens to specified addresses (admin only)
- `transfer()` - Transfers tokens between addresses
- `set_price()` - Updates price oracle data for stocks (operator only)
- `get_price()` - Retrieves current price and metadata for a stock
- `balance_of()` - Queries user balance for specific stocks

**Key Features**:
- **Mock Stock Management**: Register unlimited stock tickers (AAPL, MSFT, GOOGL, etc.)
- **Price Oracle**: Store and update real-time price data with history
- **Token Operations**: Mint and transfer mock tokens for testing scenarios
- **Access Control**: Admin and operator roles for security
- **Event Logging**: Comprehensive event emission for all operations

**Integration Points**:
- Provides price feeds for `price_oracle_adapter` testing
- Supplies underlying assets for `options_core` testing
- Enables realistic testing of `margin_engine` calculations
- Supports `settlement_engine` testing with mock stock data

---

## Main Protocol Integration (`avila_protocol.move`)

**Purpose**: The main entry point that orchestrates all other modules.

**Key Functions**:
- `create_option_series()` - Creates new option series
- `buy_options()` - Entry point for buying options
- `write_options()` - Entry point for writing options
- `exercise_american_early()` - **American early exercise entry point**
- `settle_expired_series()` - Settlement processing

**Integration Role**:
- **Orchestrator**: Coordinates calls between all modules
- **Entry Point**: Single interface for external interactions
- **Compliance Check**: Enforces compliance before allowing actions
- **Event Coordination**: Ensures proper event emission across modules

---

## How They Work Together

### **1. Option Creation Flow**
```
User → avila_protocol → options_core → events_and_auditing
                                    ↓
                              governance_admin (parameter validation)
```

### **2. Trading Flow**
```
User → avila_protocol → compliance_gate → order_book → options_core
                                    ↓
                              margin_engine → collateral_vault
                                    ↓
                              events_and_auditing
```

### **3. American Early Exercise Flow**
```
User → avila_protocol → compliance_gate → options_core → price_oracle_adapter
                                    ↓
                              settlement_engine → margin_engine
                                    ↓
                              events_and_auditing
```

### **4. Settlement Flow**
```
Expiry → avila_protocol → settlement_engine → price_oracle_adapter
                                    ↓
                              collateral_vault → margin_engine
                                    ↓
                              events_and_auditing
```

## Key Integration Patterns

### **1. Compliance First**
All user interactions go through `compliance_gate` before reaching other modules.

### **2. Event-Driven Architecture**
Every action emits events through `events_and_auditing` for complete transparency.

### **3. Risk Management Integration**
`margin_engine` validates all positions and integrates with `collateral_vault`.

### **4. Price Oracle Integration**
Real-time pricing from `price_oracle_adapter` enables American-style early exercise.

### **5. Governance Control**
`governance_admin` controls access and parameters across all modules.

### **6. Testing Infrastructure**
`multi_stock_mock` provides realistic stock data and price feeds for comprehensive testing.

## Security Features

- **Access Control**: Role-based permissions throughout
- **Input Validation**: Comprehensive parameter validation
- **Reentrancy Protection**: Prevents attack vectors
- **Overflow Protection**: Safe math operations
- **Event Logging**: Complete audit trail
- **Emergency Controls**: Ability to pause operations

## Testing Strategy

- **Unit Tests**: Individual module testing
- **Integration Tests**: Cross-module interaction testing
- **American Options Tests**: Specific early exercise scenarios
- **Security Tests**: Attack vector testing
- **Performance Tests**: Gas optimization validation

This architecture ensures that Avila Protocol provides a robust, secure, and efficient options trading platform with full American-style functionality and institutional-grade features. 