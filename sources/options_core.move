module avila_protocol::options_core {
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::account;
    use avila_protocol::price_oracle_adapter;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_SERIES_ID: u64 = 4;
    const E_INVALID_OPTION_TYPE: u64 = 5;
    const E_INVALID_SETTLEMENT_STYLE: u64 = 6;
    const E_SERIES_NOT_FOUND: u64 = 7;
    const E_SERIES_EXPIRED: u64 = 8;
    const E_INSUFFICIENT_BALANCE: u64 = 9;
    const E_NOT_EXPIRED: u64 = 10;
    const E_INVALID_QUANTITY: u64 = 11;
    const E_INVALID_STRIKE_PRICE: u64 = 12;
    const E_INVALID_CONTRACT_SIZE: u64 = 13;
    const E_INVALID_EXPIRY: u64 = 14;
    const E_SERIES_EXPIRED_CANNOT_EXERCISE: u64 = 15; // Updated error code

    /// Option types
    const OPTION_TYPE_CALL: u8 = 0;
    const OPTION_TYPE_PUT: u8 = 1;

    /// Settlement styles
    const SETTLEMENT_CASH: u8 = 0;
    const SETTLEMENT_PHYSICAL: u8 = 1;

    /// Protocol constants
    const MIN_STRIKE_PRICE: u128 = 1000; // $10.00
    const MAX_STRIKE_PRICE: u128 = 1000000000; // $10,000.00
    const MIN_CONTRACT_SIZE: u64 = 1;
    const MAX_CONTRACT_SIZE: u64 = 10000;
    const MIN_EXPIRY_DAYS: u64 = 1;
    const MAX_EXPIRY_DAYS: u64 = 365;

    /// OptionSeries resource holds series-level immutable params
    /// This enforces standardized option definition with no ad-hoc modifications
    struct OptionSeries has key, store {
        id: u64,
        underlying_asset: address,      // token address or registry id for tokenized stock
        strike_price: u128,             // price in quote currency (e.g., USDC with fixed decimals)
        expiry: u64,                    // unix timestamp (seconds) - for American options, this is the last exercise date
        option_type: u8,                // 0 = CALL, 1 = PUT
        contract_size: u64,             // shares per contract (e.g., 100)
        settlement_style: u8,           // 0 = cash-settled, 1 = physical-settled
        issuer: address,                // issuer/custodian reference (for tokenized stocks)
        total_supply: u64,              // total contracts minted
        is_active: bool,                // whether series is active
        created_at: u64,                // creation timestamp
    }

    /// Long position for option holders
    struct LongPosition has store, drop {
        series_id: u64,
        holder: address,
        quantity: u64,
        premium_paid: u128,
        created_at: u64,
    }

    /// Short position for option writers
    struct ShortPosition has store, drop {
        series_id: u64,
        writer: address,
        quantity: u64,
        premium_received: u128,
        collateral_locked: u128,
        created_at: u64,
    }

    /// Protocol state
    struct OptionsCore has key {
        admin: address,
        next_series_id: u64,
        total_series_created: u64,
        total_volume: u128,
        total_premium_collected: u128,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct SeriesCreatedEvent has drop, store {
        series_id: u64,
        underlying_asset: address,
        strike_price: u128,
        expiry: u64,
        option_type: u8,
        contract_size: u64,
        settlement_style: u8,
        issuer: address,
    }

    #[event]
    struct OptionBoughtEvent has drop, store {
        series_id: u64,
        buyer: address,
        quantity: u64,
        premium_paid: u128,
    }

    #[event]
    struct OptionWrittenEvent has drop, store {
        series_id: u64,
        writer: address,
        quantity: u64,
        premium_received: u128,
        collateral_locked: u128,
    }

    #[event]
    struct OptionExercisedEvent has drop, store {
        series_id: u64,
        holder: address,
        quantity: u64,
        payout: u128,
        exercise_price: u128, // Current market price at exercise
        is_early_exercise: bool, // true if exercised before expiry
    }

    #[event]
    struct SeriesSettledEvent has drop, store {
        series_id: u64,
        settlement_amount: u128,
    }

    /// Initialize the OptionsCore module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<OptionsCore>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, OptionsCore {
            admin: account_addr,
            next_series_id: 1,
            total_series_created: 0,
            total_volume: 0,
            total_premium_collected: 0,
            is_initialized: true,
        });
    }

    /// Create a new standardized option series (admin only)
    /// This implements the create_series function from the scaffold
    public fun create_series(
        account: &signer,
        underlying_asset: address,
        strike_price: u128,
        expiry_days: u64,
        option_type: u8,
        contract_size: u64,
        settlement_style: u8,
        issuer: address
    ): u64 acquires OptionsCore {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<OptionsCore>(@avila_protocol);
        
        // Only admin can create series
        assert!(account_addr == protocol.admin, E_UNAUTHORIZED);
        
        // Validate option type
        assert!(option_type == OPTION_TYPE_CALL || option_type == OPTION_TYPE_PUT, E_INVALID_OPTION_TYPE);
        
        // Validate settlement style
        assert!(settlement_style == SETTLEMENT_CASH || settlement_style == SETTLEMENT_PHYSICAL, E_INVALID_SETTLEMENT_STYLE);
        
        // Validate strike price
        assert!(strike_price >= MIN_STRIKE_PRICE && strike_price <= MAX_STRIKE_PRICE, E_INVALID_STRIKE_PRICE);
        
        // Validate contract size
        assert!(contract_size >= MIN_CONTRACT_SIZE && contract_size <= MAX_CONTRACT_SIZE, E_INVALID_CONTRACT_SIZE);
        
        // Validate expiry
        assert!(expiry_days >= MIN_EXPIRY_DAYS && expiry_days <= MAX_EXPIRY_DAYS, E_INVALID_EXPIRY);
        
        // Calculate expiry timestamp
        let current_time = timestamp::now_seconds();
        let expiry = current_time + (expiry_days * 86400); // 86400 seconds per day
        
        // Get next series ID
        let series_id = protocol.next_series_id;
        protocol.next_series_id = protocol.next_series_id + 1;
        
        // Create series
        let series = OptionSeries {
            id: series_id,
            underlying_asset,
            strike_price,
            expiry,
            option_type,
            contract_size,
            settlement_style,
            issuer,
            total_supply: 0,
            is_active: true,
            created_at: current_time,
        };
        
        // Store series
        move_to(account, series);
        
        // Update protocol state
        protocol.total_series_created = protocol.total_series_created + 1;

        // Emit event
        let create_event = SeriesCreatedEvent {
            series_id,
            underlying_asset,
            strike_price,
            expiry,
            option_type,
            contract_size,
            settlement_style,
            issuer,
        };
        event::emit(create_event);

        series_id
    }

    /// Mint/buy option contracts (transfer premium -> credit long position)
    /// This implements the buy_option function from the scaffold
    public fun buy_option(
        account: &signer,
        series_id: u64,
        quantity: u64,
        premium_paid: u128
    ): LongPosition acquires OptionsCore {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<OptionsCore>(@avila_protocol);
        
        // Validate quantity
        assert!(quantity > 0, E_INVALID_QUANTITY);
        assert!(premium_paid > 0, E_INVALID_QUANTITY);

        // Get series
        let series = borrow_global_mut<OptionSeries>(@avila_protocol);
        assert!(series.id == series_id, E_INVALID_SERIES_ID);
        assert!(series.is_active, E_SERIES_NOT_FOUND);
        assert!(!is_series_expired(series), E_SERIES_EXPIRED);

        // Update series supply
        series.total_supply = series.total_supply + quantity;

        // Update protocol state
        protocol.total_volume = protocol.total_volume + (quantity as u128);
        protocol.total_premium_collected = protocol.total_premium_collected + premium_paid;

        // Create long position
        let position = LongPosition {
            series_id,
            holder: account_addr,
            quantity,
            premium_paid,
            created_at: timestamp::now_seconds(),
        };

        // Emit event
        let buy_event = OptionBoughtEvent {
            series_id,
            buyer: account_addr,
            quantity,
            premium_paid,
        };
        event::emit(buy_event);

        position
    }

    /// Write (sell) option: lock collateral / margin as required by MarginEngine
    /// This implements the write_option function from the scaffold
    public fun write_option(
        account: &signer,
        series_id: u64,
        quantity: u64
    ): ShortPosition acquires OptionsCore {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<OptionsCore>(@avila_protocol);
        
        // Validate quantity
        assert!(quantity > 0, E_INVALID_QUANTITY);

        // Get series
        let series = borrow_global_mut<OptionSeries>(@avila_protocol);
        assert!(series.id == series_id, E_INVALID_SERIES_ID);
        assert!(series.is_active, E_SERIES_NOT_FOUND);
        assert!(!is_series_expired(series), E_SERIES_EXPIRED);

        // Calculate required collateral (this would integrate with MarginEngine)
        let collateral_required = calculate_required_collateral(series, quantity);
        let premium_received = 0; // This would be set by the order book matching

        // Create short position
        let position = ShortPosition {
            series_id,
            writer: account_addr,
            quantity,
            premium_received,
            collateral_locked: collateral_required,
            created_at: timestamp::now_seconds(),
        };

        // Emit event
        let write_event = OptionWrittenEvent {
            series_id,
            writer: account_addr,
            quantity,
            premium_received,
            collateral_locked: collateral_required,
        };
        event::emit(write_event);

        position
    }

    /// Exercise entrypoint - AMERICAN STYLE: can exercise at any time during contract life
    /// This allows early exercise unlike European options
    public fun exercise(
        account: &signer,
        series_id: u64,
        quantity: u64
    ): u128 acquires OptionsCore {
        let account_addr = signer::address_of(account);
        
        // Validate quantity
        assert!(quantity > 0, E_INVALID_QUANTITY);

        // Get series
        let series = borrow_global<OptionSeries>(@avila_protocol);
        assert!(series.id == series_id, E_INVALID_SERIES_ID);
        assert!(series.is_active, E_SERIES_NOT_FOUND);
        
        // AMERICAN STYLE: Check if series has expired (cannot exercise expired options)
        let current_time = timestamp::now_seconds();
        assert!(current_time < series.expiry, E_SERIES_EXPIRED_CANNOT_EXERCISE);

        // Get current market price from oracle (not settlement price)
        let (current_price, _, _) = price_oracle_adapter::get_current_price(series.underlying_asset);
        
        // Calculate payout using current market price
        let payout = calculate_exercise_payout_with_price(series, quantity, current_price);
        
        // Determine if this is early exercise
        let is_early_exercise = current_time < series.expiry;

        // Emit event
        let exercise_event = OptionExercisedEvent {
            series_id,
            holder: account_addr,
            quantity,
            payout,
            exercise_price: current_price,
            is_early_exercise,
        };
        event::emit(exercise_event);

        payout
    }

    /// Burn / settle expired series (cleanup)
    public fun settle_expired_series(
        account: &signer,
        series_id: u64
    ) acquires OptionsCore {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<OptionsCore>(@avila_protocol);
        
        // Only admin can settle expired series
        assert!(account_addr == protocol.admin, E_UNAUTHORIZED);
        
        // Get series
        let series = borrow_global_mut<OptionSeries>(@avila_protocol);
        assert!(series.id == series_id, E_INVALID_SERIES_ID);
        assert!(is_series_expired(series), E_NOT_EXPIRED);

        // Set settlement price in oracle (this will trigger TWAP calculation)
        let settlement_price = price_oracle_adapter::set_settlement_price(account, series_id, series.underlying_asset);

        // Mark as inactive
        series.is_active = false;

        // Emit event
        let settlement_event = SeriesSettledEvent {
            series_id,
            settlement_amount: settlement_price,
        };
        event::emit(settlement_event);
    }

    /// Check if series is expired
    public fun is_series_expired(series: &OptionSeries): bool {
        timestamp::now_seconds() >= series.expiry
    }

    /// Calculate required collateral for writing options
    fun calculate_required_collateral(series: &OptionSeries, quantity: u64): u128 {
        if (series.option_type == OPTION_TYPE_CALL) {
            // For call options, collateral = strike_price * contract_size * quantity
            (series.strike_price as u128) * (series.contract_size as u128) * (quantity as u128)
        } else {
            // For put options, collateral = strike_price * contract_size * quantity
            (series.strike_price as u128) * (series.contract_size as u128) * (quantity as u128)
        }
    }

    /// Calculate exercise payout using current market price
    fun calculate_exercise_payout_with_price(series: &OptionSeries, quantity: u64, current_price: u128): u128 {
        if (series.option_type == OPTION_TYPE_CALL) {
            // Call option: max(0, current_price - strike_price) * quantity * contract_size
            if (current_price > series.strike_price) {
                let profit_per_contract = current_price - series.strike_price;
                (quantity as u128) * (series.contract_size as u128) * profit_per_contract
            } else {
                0
            }
        } else {
            // Put option: max(0, strike_price - current_price) * quantity * contract_size
            if (series.strike_price > current_price) {
                let profit_per_contract = series.strike_price - current_price;
                (quantity as u128) * (series.contract_size as u128) * profit_per_contract
            } else {
                0
            }
        }
    }

    /// Calculate exercise payout (simplified) - kept for backward compatibility
    fun calculate_exercise_payout(series: &OptionSeries, quantity: u64): u128 {
        // This would integrate with PriceOracle for current underlying price
        // For now, return a simplified calculation
        if (series.option_type == OPTION_TYPE_CALL) {
            // Call option: max(0, current_price - strike_price) * quantity * contract_size
            // Simplified: assume $10 profit per contract
            (quantity as u128) * (series.contract_size as u128) * 10
        } else {
            // Put option: max(0, strike_price - current_price) * quantity * contract_size
            // Simplified: assume $5 profit per contract
            (quantity as u128) * (series.contract_size as u128) * 5
        }
    }

    /// Get series by ID
    public fun get_series(series_id: u64): OptionSeries {
        if (exists<OptionSeries>(@avila_protocol)) {
            let series = move_from<OptionSeries>(@avila_protocol);
            let series_ref = &series;
            move_to(account::create_account_for_ext(@avila_protocol), series);
            *series_ref
        } else {
            abort E_SERIES_NOT_FOUND
        }
    }

    /// Get protocol statistics
    public fun get_protocol_stats(): (address, u64, u128, u128) acquires OptionsCore {
        let protocol = borrow_global<OptionsCore>(@avila_protocol);
        (
            protocol.admin,
            protocol.total_series_created,
            protocol.total_volume,
            protocol.total_premium_collected,
        )
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<OptionsCore>(@avila_protocol)
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        initialize(account);
    }

    #[test_only]
    public fun create_series_for_test(
        account: &signer,
        underlying_asset: address,
        strike_price: u128,
        expiry_days: u64,
        option_type: u8,
        contract_size: u64,
        settlement_style: u8,
        issuer: address
    ): u64 acquires OptionsCore {
        create_series(account, underlying_asset, strike_price, expiry_days, option_type, contract_size, settlement_style, issuer)
    }
} 