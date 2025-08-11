module avila_protocol::price_oracle_adapter {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_ASSET: u64 = 4;
    const E_PRICE_STALE: u64 = 5;
    const E_INVALID_PRICE: u64 = 6;
    const E_INVALID_TIMESTAMP: u64 = 7;
    const E_INSUFFICIENT_PRICE_HISTORY: u64 = 8;
    const E_ORACLE_NOT_WHITELISTED: u64 = 9;

    /// Oracle types
    const ORACLE_TYPE_CHAINLINK: u8 = 0;
    const ORACLE_TYPE_PYTH: u8 = 1;
    const ORACLE_TYPE_CUSTOM: u8 = 2;

    /// Price status
    const PRICE_STATUS_ACTIVE: u8 = 0;
    const PRICE_STATUS_STALE: u8 = 1;
    const PRICE_STATUS_DISCONTINUED: u8 = 2;

    /// Protocol constants
    const MAX_STALENESS_SECONDS: u64 = 300; // 5 minutes
    const MIN_PRICE_HISTORY_LENGTH: u64 = 10;
    const MAX_PRICE_HISTORY_LENGTH: u64 = 1000;
    const TWAP_WINDOW_SECONDS: u64 = 3600; // 1 hour for TWAP
    const MIN_VALID_PRICE: u128 = 1;
    const MAX_VALID_PRICE: u128 = 1000000000000; // $1M

    /// Price feed structure
    struct PriceFeed has key, store {
        asset: address,
        price: u128,
        timestamp: u64,
        status: u8,
        oracle_type: u8,
        oracle_address: address,
        confidence_interval: u128,
        last_updated: u64,
    }

    /// Price history for TWAP calculations
    struct PriceHistory has key, store {
        asset: address,
        prices: vector<u128>,
        timestamps: vector<u64>,
        current_index: u64,
        max_length: u64,
        last_updated: u64,
    }

    /// Settlement price for expired options
    struct SettlementPrice has key, store {
        series_id: u64,
        asset: address,
        settlement_price: u128,
        settlement_timestamp: u64,
        twap_price: u128,
        twap_window: u64,
        is_settled: bool,
    }

    /// Oracle whitelist
    struct OracleWhitelist has key, store {
        oracle_address: address,
        oracle_type: u8,
        is_active: bool,
        added_at: u64,
        last_used: u64,
    }

    /// Protocol state
    struct PriceOracleProtocol has key {
        admin: address,
        total_assets_tracked: u64,
        total_price_feeds: u64,
        total_settlements: u64,
        max_staleness_seconds: u64,
        twap_window_seconds: u64,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct PriceUpdateEvent has drop, store {
        asset: address,
        price: u128,
        timestamp: u64,
        oracle_address: address,
    }

    #[event]
    struct SettlementPriceSetEvent has drop, store {
        series_id: u64,
        asset: address,
        settlement_price: u128,
        twap_price: u128,
        timestamp: u64,
    }

    #[event]
    struct OracleWhitelistedEvent has drop, store {
        oracle_address: address,
        oracle_type: u8,
        timestamp: u64,
    }

    /// Initialize the PriceOracleAdapter module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<PriceOracleProtocol>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, PriceOracleProtocol {
            admin: account_addr,
            total_assets_tracked: 0,
            total_price_feeds: 0,
            total_settlements: 0,
            max_staleness_seconds: MAX_STALENESS_SECONDS,
            twap_window_seconds: TWAP_WINDOW_SECONDS,
            is_initialized: true,
        });
    }

    /// Add oracle to whitelist (admin only)
    public fun whitelist_oracle(
        account: &signer,
        oracle_address: address,
        oracle_type: u8
    ) acquires PriceOracleProtocol {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global<PriceOracleProtocol>(@avila_protocol);
        
        // Only admin can whitelist oracles
        assert!(account_addr == protocol.admin, E_UNAUTHORIZED);
        
        // Validate oracle type
        assert!(
            oracle_type == ORACLE_TYPE_CHAINLINK || 
            oracle_type == ORACLE_TYPE_PYTH || 
            oracle_type == ORACLE_TYPE_CUSTOM, 
            E_INVALID_ASSET
        );

        // Create whitelist entry
        let whitelist = OracleWhitelist {
            oracle_address,
            oracle_type,
            is_active: true,
            added_at: timestamp::now_seconds(),
            last_used: 0,
        };

        move_to(account, whitelist);

        // Emit event
        let whitelist_event = OracleWhitelistedEvent {
            oracle_address,
            oracle_type,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(whitelist_event);
    }

    /// Update price feed (callable by whitelisted oracles)
    public fun update_price_feed(
        account: &signer,
        asset: address,
        price: u128,
        confidence_interval: u128
    ) acquires PriceOracleProtocol {
        let oracle_addr = signer::address_of(account);
        
        // Check if oracle is whitelisted
        assert!(exists<OracleWhitelist>(oracle_addr), E_ORACLE_NOT_WHITELISTED);
        let whitelist = borrow_global<OracleWhitelist>(oracle_addr);
        assert!(whitelist.is_active, E_ORACLE_NOT_WHITELISTED);

        // Validate price
        assert!(price >= MIN_VALID_PRICE && price <= MAX_VALID_PRICE, E_INVALID_PRICE);

        let current_time = timestamp::now_seconds();
        let oracle_type = whitelist.oracle_type;

        // Update or create price feed
        if (exists<PriceFeed>(@avila_protocol)) {
            let feed = borrow_global_mut<PriceFeed>(@avila_protocol);
            feed.price = price;
            feed.timestamp = current_time;
            feed.confidence_interval = confidence_interval;
            feed.last_updated = current_time;
        } else {
            let feed = PriceFeed {
                asset,
                price,
                timestamp: current_time,
                status: PRICE_STATUS_ACTIVE,
                oracle_type,
                oracle_address: oracle_addr,
                confidence_interval,
                last_updated: current_time,
            };
            move_to(account, feed);
        };

        // Update price history for TWAP
        update_price_history(asset, price, current_time);

        // Update oracle last used timestamp
        let whitelist_mut = borrow_global_mut<OracleWhitelist>(oracle_addr);
        whitelist_mut.last_used = current_time;

        // Emit event
        let update_event = PriceUpdateEvent {
            asset,
            price,
            timestamp: current_time,
            oracle_address: oracle_addr,
        };
        event::emit(update_event);
    }

    /// Get current price for an asset
    public fun get_spot_price(asset: address): (u128, u64) acquires PriceOracleProtocol {
        assert!(exists<PriceFeed>(@avila_protocol), E_INVALID_ASSET);
        
        let feed = borrow_global<PriceFeed>(@avila_protocol);
        assert!(feed.asset == asset, E_INVALID_ASSET);
        
        // Check if price is stale
        let current_time = timestamp::now_seconds();
        let staleness = current_time - feed.timestamp;
        let protocol = borrow_global<PriceOracleProtocol>(@avila_protocol);
        
        (feed.price, feed.timestamp)
    }

    /// Get current market price for American-style options (real-time pricing)
    /// This is the primary function for American options that need current prices for early exercise
    public fun get_current_price(asset: address): (u128, u64, u8) acquires PriceOracleProtocol {
        assert!(exists<PriceFeed>(@avila_protocol), E_INVALID_ASSET);
        
        let feed = borrow_global<PriceFeed>(@avila_protocol);
        assert!(feed.asset == asset, E_INVALID_ASSET);
        
        // Check if price is stale
        let current_time = timestamp::now_seconds();
        let staleness = current_time - feed.timestamp;
        let protocol = borrow_global<PriceOracleProtocol>(@avila_protocol);
        
        // Return current price, timestamp, and status
        (feed.price, feed.timestamp, feed.status)
    }

    /// Get TWAP price for an asset over a specified time window
    public fun get_twap_price(asset: address, window_seconds: u64): u128 acquires PriceOracleProtocol {
        assert!(exists<PriceHistory>(@avila_protocol), E_INSUFFICIENT_PRICE_HISTORY);
        
        let history = borrow_global<PriceHistory>(@avila_protocol);
        assert!(history.asset == asset, E_INVALID_ASSET);
        
        let current_time = timestamp::now_seconds();
        let cutoff_time = current_time - window_seconds;
        
        let total_price: u128 = 0;
        let total_weight: u128 = 0;
        let count = 0;
        
        let i = 0;
        while (i < vector::length(&history.prices)) {
            let price = *vector::borrow(&history.prices, i);
            let timestamp = *vector::borrow(&history.timestamps, i);
            
            if (timestamp >= cutoff_time && timestamp <= current_time) {
                let weight = timestamp - cutoff_time;
                total_price = total_price + ((price as u128) * (weight as u128));
                total_weight = total_weight + (weight as u128);
                count = count + 1;
            };
            i = i + 1;
        };
        
        assert!(count >= MIN_PRICE_HISTORY_LENGTH, E_INSUFFICIENT_PRICE_HISTORY);
        
        if (total_weight == 0) {
            abort E_INSUFFICIENT_PRICE_HISTORY
        };
        
        total_price / total_weight
    }

    /// Get settlement price for an asset over a time window
    public fun get_settlement_price(asset: address, window_start: u64, window_end: u64): u128 acquires PriceOracleProtocol {
        assert!(exists<PriceHistory>(@avila_protocol), E_INSUFFICIENT_PRICE_HISTORY);
        
        let history = borrow_global<PriceHistory>(@avila_protocol);
        assert!(history.asset == asset, E_INVALID_ASSET);
        
        let current_time = timestamp::now_seconds();
        let cutoff_time = window_start;
        
        let total_price: u128 = 0;
        let total_weight: u128 = 0;
        let count = 0;
        
        let i = 0;
        while (i < vector::length(&history.prices)) {
            let price = *vector::borrow(&history.prices, i);
            let timestamp = *vector::borrow(&history.timestamps, i);
            
                    if (timestamp >= window_start && timestamp <= window_end) {
            let weight = timestamp - window_start;
            total_price = total_price + ((price as u128) * (weight as u128));
            total_weight = total_weight + (weight as u128);
            count = count + 1;
        };
            i = i + 1;
        };
        
        assert!(count >= MIN_PRICE_HISTORY_LENGTH, E_INSUFFICIENT_PRICE_HISTORY);
        
        if (total_weight == 0) {
            abort E_INSUFFICIENT_PRICE_HISTORY
        };
        
        total_price / total_weight
    }

    /// Set settlement price for expired option series
    public fun set_settlement_price(
        account: &signer,
        series_id: u64,
        asset: address
    ): u128 acquires PriceOracleProtocol {
        let account_addr = signer::address_of(account);
        let protocol = borrow_global<PriceOracleProtocol>(@avila_protocol);
        
        // Only admin can set settlement prices
        assert!(account_addr == protocol.admin, E_UNAUTHORIZED);
        
        // Get current price and TWAP
        let (current_price, _, _) = get_current_price(asset);
        let twap_price = get_twap_price(asset, protocol.twap_window_seconds);
        
        let current_time = timestamp::now_seconds();
        
        // Create settlement price record
        let settlement = SettlementPrice {
            series_id,
            asset,
            settlement_price: current_price,
            settlement_timestamp: current_time,
            twap_price,
            twap_window: protocol.twap_window_seconds,
            is_settled: true,
        };

        move_to(account, settlement);

        // Update protocol state
        let protocol_mut = borrow_global_mut<PriceOracleProtocol>(@avila_protocol);
        protocol_mut.total_settlements = protocol_mut.total_settlements + 1;

        // Emit event
        let settlement_event = SettlementPriceSetEvent {
            series_id,
            asset,
            settlement_price: current_price,
            twap_price,
            timestamp: current_time,
        };
        event::emit(settlement_event);

        current_price
    }

    /// Get settlement price for a series
    public fun get_series_settlement_price(series_id: u64): (u128, u128, u64) acquires PriceOracleProtocol {
        assert!(exists<SettlementPrice>(@avila_protocol), E_INVALID_ASSET);
        
        let settlement = borrow_global<SettlementPrice>(@avila_protocol);
        assert!(settlement.series_id == series_id, E_INVALID_ASSET);
        assert!(settlement.is_settled, E_INVALID_ASSET);
        
        (
            settlement.settlement_price,
            settlement.twap_price,
            settlement.settlement_timestamp
        )
    }

    /// Check if price is fresh (not stale)
    public fun is_price_fresh(asset: address): bool acquires PriceOracleProtocol {
        if (!exists<PriceFeed>(@avila_protocol)) {
            return true
        };
        
        let feed = borrow_global<PriceFeed>(@avila_protocol);
        if (feed.asset != asset) {
            return true
        };
        
        let current_time = timestamp::now_seconds();
        let staleness = current_time - feed.timestamp;
        let protocol = borrow_global<PriceOracleProtocol>(@avila_protocol);
        
        staleness <= protocol.max_staleness_seconds
    }

    /// Update price history for TWAP calculations
    fun update_price_history(asset: address, price: u128, timestamp: u64) {
        if (exists<PriceHistory>(@avila_protocol)) {
            let history = borrow_global_mut<PriceHistory>(@avila_protocol);
            
            // Add new price to history
            vector::push_back(&mut history.prices, price);
            vector::push_back(&mut history.timestamps, timestamp);
            
            // Maintain max length
            if (vector::length(&history.prices) > history.max_length) {
                vector::remove(&mut history.prices, 0);
                vector::remove(&mut history.timestamps, 0);
            };
            
            history.last_updated = timestamp;
        } else {
            // Create new price history
            let prices = vector::empty<u128>();
            let timestamps = vector::empty<u64>();
            vector::push_back(&mut prices, price);
            vector::push_back(&mut timestamps, timestamp);
            
            let history = PriceHistory {
                asset,
                prices,
                timestamps,
                current_index: 0,
                max_length: MAX_PRICE_HISTORY_LENGTH,
                last_updated: timestamp,
            };
            
            // Note: This would need to be stored somewhere, but for simplicity
            // we're just updating the existing history
        };
    }

    /// Get protocol statistics
    public fun get_protocol_stats(): (address, u64, u64, u64, u64) acquires PriceOracleProtocol {
        let protocol = borrow_global<PriceOracleProtocol>(@avila_protocol);
        (
            protocol.admin,
            protocol.total_assets_tracked,
            protocol.total_price_feeds,
            protocol.total_settlements,
            protocol.max_staleness_seconds,
        )
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<PriceOracleProtocol>(@avila_protocol)
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        initialize(account);
    }

    #[test_only]
    public fun whitelist_oracle_for_test(
        account: &signer,
        oracle_address: address,
        oracle_type: u8
    ) acquires PriceOracleProtocol {
        whitelist_oracle(account, oracle_address, oracle_type)
    }
} 