module avila_protocol::avila_protocol {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use avila_protocol::options_core;
    use avila_protocol::order_book;
    use avila_protocol::margin_engine;
    use avila_protocol::settlement_engine;
    use avila_protocol::collateral_vault;
    use avila_protocol::compliance_gate;
    use avila_protocol::governance_admin;
    use avila_protocol::events_and_auditing;
    use avila_protocol::price_oracle_adapter;
    use avila_protocol::tokenized_asset_registry;

    // Position types for margin engine
    const POSITION_TYPE_LONG: u8 = 0;
    const POSITION_TYPE_SHORT: u8 = 1;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INSUFFICIENT_COLLATERAL: u64 = 4;
    const E_INVALID_SERIES_ID: u64 = 5;
    const E_INVALID_QUANTITY: u64 = 6;
    const E_INVALID_PRICE: u64 = 7;
    const E_SERIES_NOT_FOUND: u64 = 8;
    const E_SERIES_EXPIRED: u64 = 9;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 10;
    const E_COMPLIANCE_CHECK_FAILED: u64 = 11;
    const E_MARGIN_REQUIREMENT_NOT_MET: u64 = 12;
    const E_ORDER_NOT_FOUND: u64 = 13;
    const E_INVALID_ORDER_TYPE: u64 = 14;
    const E_INVALID_SETTLEMENT_STYLE: u64 = 15;
    const E_EARLY_EXERCISE_NOT_ALLOWED: u64 = 16;
    const E_MODULE_PAUSED: u64 = 17;

    // Protocol state
    struct AvilaProtocol has key {
        admin: address,
        operator: address,
        guardian: address,
        is_paused: bool,
        total_series: u64,
        total_volume: u128,
        total_fees_collected: u128,
        is_initialized: bool,
        paused_modules: vector<String>,
    }

    // Events
    struct ProtocolInitializedEvent has drop, store {
        admin: address,
        timestamp: u64,
    }

    struct SeriesCreatedEvent has drop, store {
        series_id: u64,
        underlying_asset: String,
        strike_price: u128,
        expiry: u64,
        option_type: u8,
        timestamp: u64,
    }

    struct OptionTradedEvent has drop, store {
        series_id: u64,
        buyer: address,
        seller: address,
        quantity: u64,
        price: u128,
        timestamp: u64,
    }

    struct OptionExercisedEvent has drop, store {
        series_id: u64,
        holder: address,
        quantity: u64,
        payout: u128,
        timestamp: u64,
    }

    struct AmericanEarlyExerciseEvent has drop, store {
        series_id: u64,
        holder: address,
        quantity: u64,
        payout: u128,
        timestamp: u64,
    }

    struct OrderPlacedEvent has drop, store {
        order_id: u64,
        series_id: u64,
        account: address,
        is_bid: bool,
        price: u128,
        quantity: u64,
        timestamp: u64,
    }

    struct OrderFilledEvent has drop, store {
        order_id: u64,
        series_id: u64,
        taker: address,
        maker: address,
        price: u128,
        quantity: u64,
        timestamp: u64,
    }

    struct OrderCancelledEvent has drop, store {
        order_id: u64,
        series_id: u64,
        account: address,
        quantity: u64,
        timestamp: u64,
    }

    struct MarginCallEvent has drop, store {
        account: address,
        series_id: u64,
        required_margin: u128,
        current_margin: u128,
        timestamp: u64,
    }

    struct LiquidationEvent has drop, store {
        account: address,
        series_id: u64,
        quantity: u64,
        liquidation_price: u128,
        timestamp: u64,
    }

    struct SettlementEvent has drop, store {
        series_id: u64,
        settlement_price: u128,
        total_payoff: u128,
        total_fees: u128,
        timestamp: u64,
    }

    struct ComplianceCheckEvent has drop, store {
        account: address,
        check_type: u8,
        passed: bool,
        timestamp: u64,
    }

    struct GovernanceUpdateEvent has drop, store {
        parameter: String,
        old_value: u128,
        new_value: u128,
        updated_by: address,
        timestamp: u64,
    }

    struct EmergencyPauseEvent has drop, store {
        paused_by: address,
        reason: String,
        timestamp: u64,
    }

    struct EmergencyResumeEvent has drop, store {
        resumed_by: address,
        timestamp: u64,
    }

    struct RiskParameterUpdateEvent has drop, store {
        parameter: String,
        old_value: u128,
        new_value: u128,
        updated_by: address,
        timestamp: u64,
    }

    struct CollateralDepositEvent has drop, store {
        account: address,
        amount: u128,
        new_total: u128,
        timestamp: u64,
    }

    struct CollateralWithdrawalEvent has drop, store {
        account: address,
        amount: u128,
        new_total: u128,
        timestamp: u64,
    }

    struct PriceOracleUpdateEvent has drop, store {
        asset: String,
        old_price: u128,
        new_price: u128,
        timestamp: u64,
    }

    struct TokenizedAssetRegisteredEvent has drop, store {
        asset_id: String,
        issuer: address,
        metadata: String,
        timestamp: u64,
    }

    struct TokenizedAssetUpdatedEvent has drop, store {
        asset_id: String,
        issuer: address,
        metadata: String,
        timestamp: u64,
    }

    struct TokenizedAssetDeactivatedEvent has drop, store {
        asset_id: String,
        issuer: address,
        reason: String,
        timestamp: u64,
    }

    struct ProtocolStatisticsEvent has drop, store {
        total_series: u64,
        total_volume: u128,
        total_fees_collected: u128,
        active_positions: u64,
        timestamp: u64,
    }

    /// Initialize the Avila Protocol
    public fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Check if already initialized
        assert!(!exists<AvilaProtocol>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        // Initialize all modules
        options_core::initialize(admin);
        order_book::initialize(admin);
        margin_engine::initialize(admin);
        settlement_engine::initialize(admin);
        collateral_vault::initialize(admin);
        compliance_gate::initialize(admin);
        governance_admin::initialize(admin);
        events_and_auditing::initialize(admin);
        price_oracle_adapter::initialize(admin);
        tokenized_asset_registry::initialize(admin);
        
        // Create protocol state
        let protocol = AvilaProtocol {
            admin: admin_addr,
            operator: admin_addr,
            guardian: admin_addr,
            is_paused: false,
            total_series: 0,
            total_volume: 0,
            total_fees_collected: 0,
            is_initialized: true,
            paused_modules: vector::empty(),
        };
        
        move_to(admin, protocol);
        
        // Emit initialization event
        let init_event = ProtocolInitializedEvent {
            admin: admin_addr,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(init_event);
    }

    /// Create a new options series
    public fun create_series(
        caller: &signer,
        underlying_asset: String,
        strike_price: u128,
        expiry: u64,
        option_type: u8,
        contract_size: u64,
        settlement_style: u8,
        issuer: address
    ): u64 {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Create the series
        let series_id = options_core::create_series(
            underlying_asset,
            strike_price,
            expiry,
            option_type,
            contract_size,
            settlement_style,
            issuer,
            true // is_american_style
        );
        
        // Update protocol statistics
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        protocol.total_series = protocol.total_series + 1;
        
        // Emit event
        let series_event = SeriesCreatedEvent {
            series_id,
            underlying_asset,
            strike_price,
            expiry,
            option_type,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(series_event);
        
        series_id
    }

    /// Buy an option
    public fun buy_option(
        buyer: &signer,
        series_id: u64,
        quantity: u64,
        premium_paid: u128
    ) {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Check compliance
        let buyer_addr = signer::address_of(buyer);
        assert!(compliance_gate::check_user_compliance(buyer_addr), E_COMPLIANCE_CHECK_FAILED);
        
        // Check margin requirements
        margin_engine::check_margin_requirements(buyer_addr);
        
        // Execute the trade
        options_core::buy_option(series_id, buyer, quantity, premium_paid);
        
        // Update margin engine
        margin_engine::register_position(buyer_addr, series_id, POSITION_TYPE_LONG, quantity, premium_paid, true);
        
        // Update protocol statistics
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        protocol.total_volume = protocol.total_volume + (quantity as u128) * premium_paid;
        
        // Emit events
        events_and_auditing::emit_option_bought(series_id, buyer_addr, quantity, premium_paid);
        
        let trade_event = OptionTradedEvent {
            series_id,
            buyer: buyer_addr,
            seller: @avila_protocol, // Protocol as seller for now
            quantity,
            price: premium_paid,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(trade_event);
    }

    /// Write (sell) an option
    public fun write_option(
        writer: &signer,
        series_id: u64,
        quantity: u64,
        premium_received: u128
    ) {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Check compliance
        let writer_addr = signer::address_of(writer);
        assert!(compliance_gate::check_user_compliance(writer_addr), E_COMPLIANCE_CHECK_FAILED);
        
        // Check margin requirements
        margin_engine::check_margin_requirements(writer_addr);
        
        // Lock collateral
        let collateral_locked = collateral_vault::lock_collateral(writer, series_id, quantity);
        
        // Execute the trade
        options_core::write_option(series_id, writer, quantity);
        
        // Update margin engine
        margin_engine::register_position(writer_addr, series_id, POSITION_TYPE_SHORT, quantity, premium_received, true);
        
        // Update protocol statistics
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        protocol.total_volume = protocol.total_volume + (quantity as u128) * premium_received;
        
        // Emit events
        events_and_auditing::emit_option_written(series_id, writer_addr, quantity, premium_received, collateral_locked);
        
        let trade_event = OptionTradedEvent {
            series_id,
            buyer: @avila_protocol, // Protocol as buyer for now
            seller: writer_addr,
            quantity,
            price: premium_received,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(trade_event);
    }

    /// Exercise an option at expiry
    public fun exercise(
        holder: &signer,
        series_id: u64,
        quantity: u64
    ): u128 {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Execute the exercise
        let payout = options_core::exercise(series_id, holder, quantity);
        
        // Update margin engine (close position)
        let holder_addr = signer::address_of(holder);
        margin_engine::register_position(holder_addr, series_id, POSITION_TYPE_LONG, 0, 0, true);
        
        // Emit event
        let exercise_event = OptionExercisedEvent {
            series_id,
            holder: holder_addr,
            quantity,
            payout,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(exercise_event);
        
        payout
    }

    /// Early exercise for American-style options
    public fun early_exercise_american(
        holder: &signer,
        series_id: u64,
        quantity: u64
    ): u128 {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Get current market price for early exercise
        let current_market_price = price_oracle_adapter::get_current_price(series_id);
        
        // Handle early exercise
        let payout = settlement_engine::handle_american_early_exercise(series_id, holder, quantity, current_market_price);
        
        // Update margin engine (close position)
        let holder_addr = signer::address_of(holder);
        margin_engine::register_position(holder_addr, series_id, POSITION_TYPE_LONG, 0, 0, true);
        
        // Emit event
        let early_exercise_event = AmericanEarlyExerciseEvent {
            series_id,
            holder: holder_addr,
            quantity,
            payout,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(early_exercise_event);
        
        payout
    }

    /// Get series information
    public fun get_series_info(series_id: u64): (String, u128, u64, u8, u64, u8) {
        let series_info = options_core::get_series_info(series_id);
        let settlement_style = options_core::get_settlement_style(series_id);
        (series_info.0, series_info.1, series_info.2, series_info.3, series_info.4, settlement_style)
    }

    /// Place an order in the order book
    public fun place_order(
        caller: &signer,
        series_id: u64,
        is_bid: bool,
        price: u128,
        quantity: u64
    ): u64 {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Check compliance
        let caller_addr = signer::address_of(caller);
        assert!(compliance_gate::check_user_compliance(caller_addr), E_COMPLIANCE_CHECK_FAILED);
        
        // Place the order
        let order_id = order_book::place_order(series_id, caller, is_bid, price, quantity);
        
        // Emit event
        let order_event = OrderPlacedEvent {
            order_id,
            series_id,
            account: caller_addr,
            is_bid,
            price,
            quantity,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(order_event);
        
        order_id
    }

    /// Cancel an order
    public fun cancel_order(
        caller: &signer,
        order_id: u64
    ): u64 {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Cancel the order
        let cancelled_quantity = order_book::cancel_order(caller, order_id);
        
        // Emit event
        let caller_addr = signer::address_of(caller);
        let order_event = OrderCancelledEvent {
            order_id,
            series_id: 0, // Will be updated with actual series_id
            account: caller_addr,
            quantity: cancelled_quantity,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(order_event);
        
        cancelled_quantity
    }

    /// Check and trigger liquidation for an account
    public fun check_liquidation(account: address) {
        // Check if protocol is paused
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        assert!(!protocol.is_paused, E_MODULE_PAUSED);
        
        // Check margin requirements and trigger liquidation if needed
        margin_engine::trigger_margin_call(account);
    }

    /// Emergency pause the protocol
    public fun emergency_pause(
        caller: &signer,
        reason: String
    ) {
        // Only admin or guardian can pause
        let caller_addr = signer::address_of(caller);
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        assert!(caller_addr == protocol.admin || caller_addr == protocol.guardian, E_UNAUTHORIZED);
        
        protocol.is_paused = true;
        
        // Emit event
        let pause_event = EmergencyPauseEvent {
            paused_by: caller_addr,
            reason,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(pause_event);
    }

    /// Emergency resume the protocol
    public fun emergency_resume(
        caller: &signer
    ) {
        // Only admin can resume
        let caller_addr = signer::address_of(caller);
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        assert!(caller_addr == protocol.admin, E_UNAUTHORIZED);
        
        protocol.is_paused = false;
        
        // Emit event
        let resume_event = EmergencyResumeEvent {
            resumed_by: caller_addr,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(resume_event);
    }

    /// Get protocol statistics
    public fun get_protocol_stats(): (address, address, address, bool, u64, u128, u128) {
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        (
            protocol.admin,
            protocol.operator,
            protocol.guardian,
            protocol.is_paused,
            protocol.total_series,
            protocol.total_volume,
            protocol.total_fees_collected
        )
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<AvilaProtocol>(@avila_protocol)
    }

    /// Get module name (helper function)
    fun module_name(): vector<u8> {
        b"avila_protocol"
    }
} 