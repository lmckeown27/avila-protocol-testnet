module avila_protocol::settlement_engine {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use avila_protocol::options_core;
    use avila_protocol::price_oracle_adapter;
    use avila_protocol::tokenized_asset_registry;
    use avila_protocol::collateral_vault;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_SERIES: u64 = 4;
    const E_SERIES_NOT_EXPIRED: u64 = 5;
    const E_ALREADY_SETTLED: u64 = 6;
    const E_INSUFFICIENT_COLLATERAL: u64 = 7;
    const E_INVALID_SETTLEMENT_TYPE: u64 = 8;
    const E_INSUFFICIENT_BALANCE: u64 = 9;
    const E_INVALID_PAYOFF: u64 = 10;
    const E_EARLY_EXERCISE_NOT_ALLOWED: u64 = 11; // For European-style restrictions (if needed)
    const E_INVALID_EXERCISE_TIME: u64 = 12; // For American-style timing validation

    /// Settlement types
    const SETTLEMENT_TYPE_CASH: u8 = 0;
    const SETTLEMENT_TYPE_PHYSICAL: u8 = 1;
    const SETTLEMENT_TYPE_AMERICAN_EARLY: u8 = 2; // New: American early exercise settlement

    /// Settlement status
    const SETTLEMENT_STATUS_PENDING: u8 = 0;
    const SETTLEMENT_STATUS_IN_PROGRESS: u8 = 1;
    const SETTLEMENT_STATUS_COMPLETED: u8 = 2;
    const SETTLEMENT_STATUS_FAILED: u8 = 3;
    const SETTLEMENT_STATUS_EARLY_EXERCISED: u8 = 4; // New: Early exercise status

    /// Option types
    const OPTION_TYPE_CALL: u8 = 0;
    const OPTION_TYPE_PUT: u8 = 1;

    /// Protocol constants
    const MIN_SETTLEMENT_AMOUNT: u128 = 100; // $1.00
    const MAX_SETTLEMENT_AMOUNT: u128 = 1000000000000; // $1B
    const SETTLEMENT_FEE_BPS: u64 = 10; // 0.1% settlement fee
    const AMERICAN_EARLY_EXERCISE_FEE_BPS: u64 = 15; // 0.15% fee for early exercise (higher due to complexity)

    /// Settlement record
    struct SettlementRecord has key, store {
        series_id: u64,
        settlement_type: u8,
        settlement_price: u128,
        settlement_timestamp: u64,
        status: u8,
        total_payoff: u128,
        total_fees: u128,
        is_early_exercise: bool, // New: Track if this was early exercise
        exercise_holder: address, // New: Who exercised early
        created_at: u64,
        completed_at: u64,
    }

    /// Payout record
    struct PayoutRecord has key, store {
        payout_id: u64,
        series_id: u64,
        recipient: address,
        amount: u128,
        payout_type: u8, // 0 = long payoff, 1 = short collateral return, 2 = fee
        status: u8, // 0 = pending, 1 = completed, 2 = failed
        created_at: u64,
        completed_at: u64,
    }

    /// Protocol state
    struct SettlementEngineProtocol has key {
        admin: address,
        next_settlement_id: u64,
        next_payout_id: u64,
        total_settlements: u64,
        total_payouts: u64,
        total_fees_collected: u128,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct SettlementInitiatedEvent has drop, store {
        series_id: u64,
        settlement_type: u8,
        settlement_price: u128,
        timestamp: u64,
    }

    #[event]
    struct SettlementCompletedEvent has drop, store {
        series_id: u64,
        total_payoff: u128,
        total_fees: u128,
        timestamp: u64,
    }

    #[event]
    struct PayoutCompletedEvent has drop, store {
        payout_id: u64,
        series_id: u64,
        recipient: address,
        amount: u128,
        payout_type: u8,
        timestamp: u64,
    }

    /// Initialize the SettlementEngine module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<SettlementEngineProtocol>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, SettlementEngineProtocol {
            admin: account_addr,
            next_settlement_id: 1,
            next_payout_id: 1,
            total_settlements: 0,
            total_payouts: 0,
            total_fees_collected: 0,
            is_initialized: true,
        });
    }

    /// Settle cash-settled options
    public fun settle_cash(series_id: u64) acquires SettlementEngineProtocol {
        // Check if series exists and is expired
        assert!(options_core::is_series_expired(series_id), E_SERIES_NOT_EXPIRED);
        
        // Check if already settled
        assert!(!exists<SettlementRecord>(@avila_protocol), E_ALREADY_SETTLED);

        // Get settlement price from oracle
        let (settlement_price, _, _) = price_oracle_adapter::get_settlement_price(series_id);
        
        let current_time = timestamp::now_seconds();
        
        // Calculate total payoff for all positions
        let total_payoff = calculate_total_cash_payoff(series_id, settlement_price);
        let total_fees = ((total_payoff as u128) * (SETTLEMENT_FEE_BPS as u128)) / 10000;
        
        // Create settlement record
        let settlement = SettlementRecord {
            series_id,
            settlement_type: SETTLEMENT_TYPE_CASH,
            settlement_price,
            settlement_timestamp: current_time,
            status: SETTLEMENT_STATUS_IN_PROGRESS,
            total_payoff,
            total_fees,
            is_early_exercise: false,
            exercise_holder: signer::address_of(account::create_account_for_ext(@avila_protocol)), // Placeholder, will be updated
            created_at: current_time,
            completed_at: 0,
        };

        // Store settlement record
        move_to(account::create_account_for_ext(@avila_protocol), settlement);

        // Update protocol state
        let protocol = borrow_global_mut<SettlementEngineProtocol>(@avila_protocol);
        protocol.total_settlements = protocol.total_settlements + 1;
        protocol.total_fees_collected = protocol.total_fees_collected + total_fees;

        // Emit event
        let settlement_event = SettlementInitiatedEvent {
            series_id,
            settlement_type: SETTLEMENT_TYPE_CASH,
            settlement_price,
            timestamp: current_time,
        };
        event::emit(settlement_event);
    }

    /// Settle physical-settled options
    public fun settle_physical(series_id: u64) acquires SettlementEngineProtocol {
        // Check if series exists and is expired
        assert!(options_core::is_series_expired(series_id), E_SERIES_NOT_EXPIRED);
        
        // Check if already settled
        assert!(!exists<SettlementRecord>(@avila_protocol), E_ALREADY_SETTLED);

        // Get settlement price from oracle
        let (settlement_price, _, _) = price_oracle_adapter::get_settlement_price(series_id);
        
        let current_time = timestamp::now_seconds();
        
        // Calculate total payoff for all positions
        let total_payoff = calculate_total_physical_payoff(series_id, settlement_price);
        let total_fees = ((total_payoff as u128) * (SETTLEMENT_FEE_BPS as u128)) / 10000;
        
        // Create settlement record
        let settlement = SettlementRecord {
            series_id,
            settlement_type: SETTLEMENT_TYPE_PHYSICAL,
            settlement_price,
            settlement_timestamp: current_time,
            status: SETTLEMENT_STATUS_IN_PROGRESS,
            total_payoff,
            total_fees,
            is_early_exercise: false,
            exercise_holder: signer::address_of(account::create_account_for_ext(@avila_protocol)), // Placeholder, will be updated
            created_at: current_time,
            completed_at: 0,
        };

        // Store settlement record
        move_to(account::create_account_for_ext(@avila_protocol), settlement);

        // Update protocol state
        let protocol = borrow_global_mut<SettlementEngineProtocol>(@avila_protocol);
        protocol.total_settlements = protocol.total_settlements + 1;
        protocol.total_fees_collected = protocol.total_fees_collected + total_fees;

        // Emit event
        let settlement_event = SettlementInitiatedEvent {
            series_id,
            settlement_type: SETTLEMENT_TYPE_PHYSICAL,
            settlement_price,
            timestamp: current_time,
        };
        event::emit(settlement_event);
    }

    /// Disburse payouts for a settled series
    public fun disburse_payouts(series_id: u64) acquires SettlementEngineProtocol {
        // Check if settlement exists and is in progress
        assert!(exists<SettlementRecord>(@avila_protocol), E_INVALID_SERIES);
        let settlement = borrow_global_mut<SettlementRecord>(@avila_protocol);
        assert!(settlement.series_id == series_id, E_INVALID_SERIES);
        assert!(settlement.status == SETTLEMENT_STATUS_IN_PROGRESS, E_INVALID_SETTLEMENT_TYPE);

        let current_time = timestamp::now_seconds();
        
        // Get all positions for the series
        let (long_positions, short_positions) = options_core::get_series_positions(series_id);
        
        // Process long position payouts
        let i = 0;
        while (i < vector::length(&long_positions)) {
            let position = vector::borrow(&long_positions, i);
            let payoff = calculate_long_payoff(series_id, position.quantity, settlement.settlement_price);
            
            if (payoff > 0) {
                create_payout_record(series_id, position.holder, payoff, 0); // long payoff
            };
            i = i + 1;
        };

        // Process short position payouts (collateral returns)
        let i = 0;
        while (i < vector::length(&short_positions)) {
            let position = vector::borrow(&short_positions, i);
            let collateral_return = calculate_short_collateral_return(series_id, position.quantity, settlement.settlement_price);
            
            if (collateral_return > 0) {
                create_payout_record(series_id, position.writer, collateral_return, 1); // short collateral return
            };
            i = i + 1;
        };

        // Mark settlement as completed
        settlement.status = SETTLEMENT_STATUS_COMPLETED;
        settlement.completed_at = current_time;

        // Emit completion event
        let completion_event = SettlementCompletedEvent {
            series_id,
            total_payoff: settlement.total_payoff,
            total_fees: settlement.total_fees,
            timestamp: current_time,
        };
        event::emit(completion_event);
    }

    /// Create payout record
    fun create_payout_record(
        series_id: u64,
        recipient: address,
        amount: u128,
        payout_type: u8
    ) acquires SettlementEngineProtocol {
        let protocol = borrow_global_mut<SettlementEngineProtocol>(@avila_protocol);
        let payout_id = protocol.next_payout_id;
        protocol.next_payout_id = protocol.next_payout_id + 1;
        protocol.total_payouts = protocol.total_payouts + 1;

        let current_time = timestamp::now_seconds();

        let payout = PayoutRecord {
            payout_id,
            series_id,
            recipient,
            amount,
            payout_type,
            status: SETTLEMENT_STATUS_PENDING,
            created_at: current_time,
            completed_at: 0,
        };

        // Store payout record
        move_to(account::create_account_for_ext(recipient), payout);

        // Emit payout event
        let payout_event = PayoutCompletedEvent {
            payout_id,
            series_id,
            recipient,
            amount,
            payout_type,
            timestamp: current_time,
        };
        event::emit(payout_event);
    }

    /// Calculate total cash payoff for a series
    fun calculate_total_cash_payoff(series_id: u64, settlement_price: u128): u128 {
        // Get series information
        let (underlying_asset, strike_price, option_type, contract_size) = options_core::get_series_info(series_id);
        
        // Get all positions
        let (long_positions, short_positions) = options_core::get_series_positions(series_id);
        
        let total_payoff: u128 = 0;
        
        // Calculate long position payoffs
        let i = 0;
        while (i < vector::length(&long_positions)) {
            let position = vector::borrow(&long_positions, i);
            let payoff = calculate_long_payoff(series_id, position.quantity, settlement_price);
            total_payoff = total_payoff + payoff;
            i = i + 1;
        };

        total_payoff
    }

    /// Calculate total physical payoff for a series
    fun calculate_total_physical_payoff(series_id: u64, settlement_price: u128): u128 {
        // For physical settlement, payoff is based on underlying asset value
        // This is a simplified calculation - in production would handle actual asset transfers
        calculate_total_cash_payoff(series_id, settlement_price)
    }

    /// Calculate long position payoff
    fun calculate_long_payoff(series_id: u64, quantity: u64, settlement_price: u128): u128 {
        let (underlying_asset, strike_price, option_type, contract_size) = options_core::get_series_info(series_id);
        
        let payoff: u128 = 0;
        
        if (option_type == OPTION_TYPE_CALL) {
            // Call option payoff: max(0, settlement_price - strike_price) * quantity * contract_size
            if (settlement_price > strike_price) {
                payoff = (settlement_price - strike_price) * (quantity as u128) * (contract_size as u128);
            };
        } else {
            // Put option payoff: max(0, strike_price - settlement_price) * quantity * contract_size
            if (strike_price > settlement_price) {
                payoff = (strike_price - settlement_price) * (quantity as u128) * (contract_size as u128);
            };
        };

        payoff
    }

    /// Calculate short position collateral return
    fun calculate_short_collateral_return(series_id: u64, quantity: u64, settlement_price: u128): u128 {
        let (underlying_asset, strike_price, option_type, contract_size) = options_core::get_series_info(series_id);
        
        // Short positions get their collateral back minus any losses
        let long_payoff = calculate_long_payoff(series_id, quantity, settlement_price);
        let total_collateral = options_core::get_series_total_collateral(series_id);
        
        if (long_payoff > total_collateral) {
            0 // No collateral return if losses exceed collateral
        } else {
            total_collateral - long_payoff
        }
    }

    /// Get settlement record
    public fun get_settlement_record(series_id: u64): (u8, u128, u64, u8, u128, u128) {
        if (exists<SettlementRecord>(@avila_protocol)) {
            let settlement = borrow_global<SettlementRecord>(@avila_protocol);
            if (settlement.series_id == series_id) {
                (
                    settlement.settlement_type,
                    settlement.settlement_price,
                    settlement.settlement_timestamp,
                    settlement.status,
                    settlement.total_payoff,
                    settlement.total_fees,
                )
            } else {
                (0, 0, 0, 0, 0, 0)
            }
        } else {
            (0, 0, 0, 0, 0, 0)
        }
    }

    /// Get payout records for a series
    public fun get_payout_records(series_id: u64): vector<u64> {
        // This would return payout IDs for a series
        // For simplicity, returning empty vector
        vector::empty<u64>()
    }

    /// Handle American-style early exercise settlement
    /// This allows options to be exercised before expiry, creating immediate settlements
    public fun handle_american_early_exercise(
        account: &signer,
        series_id: u64,
        quantity: u64,
        current_market_price: u128
    ) acquires SettlementEngineProtocol {
        let account_addr = signer::address_of(account);
        
        // Validate inputs
        assert!(quantity > 0, E_INVALID_PAYOFF);
        assert!(current_market_price > 0, E_INVALID_PAYOFF);
        
        // Check if series is already settled
        if (exists<SettlementRecord>(@avila_protocol)) {
            let existing_settlement = borrow_global<SettlementRecord>(@avila_protocol);
            assert!(existing_settlement.series_id != series_id || existing_settlement.status == SETTLEMENT_STATUS_PENDING, E_ALREADY_SETTLED);
        };

        let current_time = timestamp::now_seconds();
        
        // Calculate early exercise payoff
        let payoff = calculate_long_payoff(series_id, quantity, current_market_price);
        assert!(payoff > 0, E_INVALID_PAYOFF);
        
        // Calculate early exercise fees (higher than regular settlement)
        let early_exercise_fee = (payoff * AMERICAN_EARLY_EXERCISE_FEE_BPS) / 10000;
        let net_payoff = payoff - early_exercise_fee;
        
        // Create early exercise settlement record
        let settlement = SettlementRecord {
            series_id,
            settlement_type: SETTLEMENT_TYPE_AMERICAN_EARLY,
            settlement_price: current_market_price,
            settlement_timestamp: current_time,
            status: SETTLEMENT_STATUS_EARLY_EXERCISED,
            total_payoff: net_payoff,
            total_fees: early_exercise_fee,
            is_early_exercise: true,
            exercise_holder: account_addr,
            created_at: current_time,
            completed_at: current_time, // Early exercise is immediately completed
        };

        // Store settlement record
        move_to(account::create_account_for_ext(@avila_protocol), settlement);

        // Update protocol state
        let protocol = borrow_global_mut<SettlementEngineProtocol>(@avila_protocol);
        protocol.total_settlements = protocol.total_settlements + 1;
        protocol.total_fees_collected = protocol.total_fees_collected + early_exercise_fee;

        // Create immediate payout record for early exercise
        create_payout_record(series_id, account_addr, net_payoff, 0); // long payoff

        // Emit early exercise settlement event
        let early_exercise_event = SettlementInitiatedEvent {
            series_id,
            settlement_type: SETTLEMENT_TYPE_AMERICAN_EARLY,
            settlement_price: current_market_price,
            timestamp: current_time,
        };
        event::emit(early_exercise_event);
    }

    /// Get protocol statistics
    public fun get_protocol_stats(): (address, u64, u64, u128) acquires SettlementEngineProtocol {
        let protocol = borrow_global<SettlementEngineProtocol>(@avila_protocol);
        (
            protocol.admin,
            protocol.total_settlements,
            protocol.total_payouts,
            protocol.total_fees_collected,
        )
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<SettlementEngineProtocol>(@avila_protocol)
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        initialize(account);
    }
} 