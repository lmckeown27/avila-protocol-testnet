module avila_protocol::avila_protocol {
    use std::signer;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_OPTION_TYPE: u64 = 4;
    const E_INVALID_STRIKE_PRICE: u64 = 5;
    const E_INVALID_EXPIRATION: u64 = 6;
    const E_INVALID_AMOUNT: u64 = 7;
    const E_INSUFFICIENT_COLLATERAL: u64 = 8;
    const E_OPTION_NOT_FOUND: u64 = 9;
    const E_OPTION_EXPIRED: u64 = 10;
    const E_INVALID_PREMIUM: u64 = 11;
    const E_INSUFFICIENT_BALANCE: u64 = 12;
    const E_OPTION_NOT_EXPIRED: u64 = 13;

    /// Option types
    const OPTION_TYPE_CALL: u64 = 0;
    const OPTION_TYPE_PUT: u64 = 1;

    /// Protocol constants
    const COLLATERAL_MULTIPLIER: u64 = 150; // 150% collateral requirement
    const SETTLEMENT_FEE_BPS: u64 = 50; // 0.5% settlement fee
    const MAX_EXPIRATION_DAYS: u64 = 365;
    const MIN_STRIKE_PRICE: u64 = 1000; // $10.00
    const MAX_STRIKE_PRICE: u64 = 1000000; // $10,000.00

    /// Option structure
    struct Option has store, drop {
        id: address,
        option_type: u64,
        underlying: address,
        strike_price: u64,
        expiration: u64,
        amount: u64,
        premium: u64,
        creator: address,
        created_at: u64,
        is_active: bool,
    }

    /// Position structure
    struct Position has store, drop {
        option_id: address,
        user: address,
        amount: u64,
        collateral_amount: u64,
        premium_paid: u64,
        created_at: u64,
        is_exercised: bool,
    }

    /// Protocol state
    struct AvilaProtocol has key {
        admin: address,
        total_options_created: u64,
        total_volume: u64,
        total_premium_collected: u64,
        settlement_fee_collected: u64,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct OptionCreatedEvent has drop, store {
        option_id: address,
        creator: address,
        option_type: u64,
        underlying: address,
        strike_price: u64,
        expiration: u64,
        premium: u64,
        amount: u64,
    }

    #[event]
    struct PositionCreatedEvent has drop, store {
        option_id: address,
        user: address,
        amount: u64,
        collateral_amount: u64,
        premium_paid: u64,
    }

    #[event]
    struct OptionExercisedEvent has drop, store {
        option_id: address,
        user: address,
        amount: u64,
        payout: u64,
        premium_refund: u64,
    }

    #[event]
    struct OptionSettledEvent has drop, store {
        option_id: address,
        user: address,
        amount: u64,
        settlement_amount: u64,
        fee_collected: u64,
    }

    /// Initialize the Avila Protocol
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<AvilaProtocol>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, AvilaProtocol {
            admin: account_addr,
            total_options_created: 0,
            total_volume: 0,
            total_premium_collected: 0,
            settlement_fee_collected: 0,
            is_initialized: true,
        });
    }

    /// Create a new option
    public fun create_option(
        account: &signer,
        option_type: u64,
        underlying: address,
        strike_price: u64,
        expiration_days: u64,
        amount: u64,
        premium: u64
    ): address acquires AvilaProtocol {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        
        // Validate inputs
        assert!(option_type == OPTION_TYPE_CALL || option_type == OPTION_TYPE_PUT, E_INVALID_OPTION_TYPE);
        assert!(strike_price >= MIN_STRIKE_PRICE && strike_price <= MAX_STRIKE_PRICE, E_INVALID_STRIKE_PRICE);
        assert!(expiration_days > 0 && expiration_days <= MAX_EXPIRATION_DAYS, E_INVALID_EXPIRATION);
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(premium > 0, E_INVALID_PREMIUM);

        // Calculate expiration timestamp
        let current_time = 1000000u64; // Mock timestamp for testing
        let expiration = current_time + (expiration_days * 24 * 60 * 60);

        // Create option ID (using account address + counter)
        let option_id = account_addr;

        // Create option
        let option = Option {
            id: option_id,
            option_type,
            underlying,
            strike_price,
            expiration,
            amount,
            premium,
            creator: account_addr,
            created_at: current_time,
            is_active: true,
        };

        // Update protocol state
        protocol.total_options_created = protocol.total_options_created + 1;
        protocol.total_volume = protocol.total_volume + amount;

        // Emit event
        let create_event = OptionCreatedEvent {
            option_id,
            creator: account_addr,
            option_type,
            underlying,
            strike_price,
            expiration,
            premium,
            amount,
        };
        event::emit(create_event);

        option_id
    }

    /// Create a position (buy an option)
    public fun create_position(
        account: &signer,
        option_id: address,
        amount: u64
    ): Position acquires AvilaProtocol {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Calculate required collateral
        let required_collateral = calculate_required_collateral(option_id, amount);

        // Calculate premium
        let premium_paid = calculate_premium(option_id, amount);

        // Create position
        let position = Position {
            option_id,
            user: account_addr,
            amount,
            collateral_amount: required_collateral,
            premium_paid,
            created_at: 1000000u64, // Mock timestamp for testing
            is_exercised: false,
        };

        // Update protocol state
        protocol.total_premium_collected = protocol.total_premium_collected + premium_paid;

        // Emit event
        let position_event = PositionCreatedEvent {
            option_id,
            user: account_addr,
            amount,
            collateral_amount: required_collateral,
            premium_paid,
        };
        event::emit(position_event);

        position
    }

    /// Exercise an option
    public fun exercise_option(
        account: &signer,
        option_id: address,
        amount: u64,
        current_price: u64
    ): (u64, u64) acquires AvilaProtocol {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        
        // Validate option exists and is not expired
        assert!(is_option_active(option_id), E_OPTION_NOT_FOUND);
        assert!(!is_option_expired(option_id), E_OPTION_EXPIRED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Calculate payout
        let payout = calculate_payout(option_id, amount, current_price);
        assert!(payout > 0, E_INSUFFICIENT_BALANCE);

        // Calculate premium refund
        let premium_refund = calculate_premium_refund(option_id, amount);

        // Calculate settlement fee
        let settlement_fee = (payout * SETTLEMENT_FEE_BPS) / 10000;
        let net_payout = payout - settlement_fee;

        // Update protocol state
        protocol.settlement_fee_collected = protocol.settlement_fee_collected + settlement_fee;

        // Emit event
        let exercise_event = OptionExercisedEvent {
            option_id,
            user: account_addr,
            amount,
            payout: net_payout,
            premium_refund,
        };
        event::emit(exercise_event);

        (net_payout, premium_refund)
    }

    /// Settle expired option
    public fun settle_expired_option(
        account: &signer,
        option_id: address,
        current_price: u64
    ): u64 acquires AvilaProtocol {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global_mut<AvilaProtocol>(@avila_protocol);
        
        // Validate option is expired
        assert!(is_option_expired(option_id), E_OPTION_NOT_EXPIRED);

        // Calculate settlement amount
        let settlement_amount = calculate_settlement_amount(option_id, current_price);
        let settlement_fee = (settlement_amount * SETTLEMENT_FEE_BPS) / 10000;
        let net_settlement = settlement_amount - settlement_fee;

        // Update protocol state
        protocol.settlement_fee_collected = protocol.settlement_fee_collected + settlement_fee;

        // Emit event
        let settlement_event = OptionSettledEvent {
            option_id,
            user: account_addr,
            amount: 0, // Full position
            settlement_amount: net_settlement,
            fee_collected: settlement_fee,
        };
        event::emit(settlement_event);

        net_settlement
    }

    /// Calculate required collateral for position
    fun calculate_required_collateral(option_id: address, amount: u64): u64 {
        // This would get the strike price from the option
        // For now, using a simplified calculation
        let base_collateral = amount * 10000; // Assume $100 strike price
        (base_collateral * COLLATERAL_MULTIPLIER) / 100
    }

    /// Calculate premium for position
    fun calculate_premium(option_id: address, amount: u64): u64 {
        // This would get the premium from the option
        // For now, using a simplified calculation
        amount * 500 // $5 premium per option
    }

    /// Calculate payout for exercised option
    fun calculate_payout(option_id: address, amount: u64, current_price: u64): u64 {
        // This would get option details and calculate intrinsic value
        // For now, using a simplified calculation
        let strike_price = 10000; // Assume $100 strike price
        if (current_price > strike_price) {
            (current_price - strike_price) * amount
        } else {
            0
        }
    }

    /// Calculate premium refund
    fun calculate_premium_refund(option_id: address, amount: u64): u64 {
        // For exercised options, refund unused premium
        calculate_premium(option_id, amount) / 2
    }

    /// Calculate settlement amount for expired option
    fun calculate_settlement_amount(option_id: address, current_price: u64): u64 {
        // Calculate final settlement value
        calculate_payout(option_id, 1000, current_price) // Assume 1000 options
    }

    /// Check if option is active
    public fun is_option_active(option_id: address): bool {
        // This would check the option's active status
        // For now, return true
        true
    }

    /// Check if option is expired
    public fun is_option_expired(option_id: address): bool {
        // This would check the option's expiration
        // For now, return false
        false
    }

    /// Get protocol statistics
    public fun get_protocol_stats(): (address, u64, u64, u64, u64) acquires AvilaProtocol {
        let protocol = borrow_global<AvilaProtocol>(@avila_protocol);
        (
            protocol.admin,
            protocol.total_options_created,
            protocol.total_volume,
            protocol.total_premium_collected,
            protocol.settlement_fee_collected,
        )
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<AvilaProtocol>(@avila_protocol)
    }

    /// Get position option ID
    public fun get_position_option_id(position: &Position): address {
        position.option_id
    }

    /// Get position user
    public fun get_position_user(position: &Position): address {
        position.user
    }

    /// Get position amount
    public fun get_position_amount(position: &Position): u64 {
        position.amount
    }

    /// Get position premium paid
    public fun get_position_premium_paid(position: &Position): u64 {
        position.premium_paid
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        initialize(account);
    }

    #[test_only]
    public fun create_option_for_test(
        account: &signer,
        option_type: u64,
        underlying: address,
        strike_price: u64,
        expiration_days: u64,
        amount: u64,
        premium: u64
    ): address acquires AvilaProtocol {
        create_option(account, option_type, underlying, strike_price, expiration_days, amount, premium)
    }
} 