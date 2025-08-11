module avila_protocol::margin_engine {
    use std::signer;
    use std::vector;
    use std::option::{Self, Option};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use avila_protocol::options_core;
    use avila_protocol::price_oracle_adapter;

    // Error codes
    const E_INSUFFICIENT_MARGIN: u64 = 1;
    const E_POSITION_NOT_FOUND: u64 = 2;
    const E_INVALID_POSITION_TYPE: u64 = 3;
    const E_MARGIN_CALL_REQUIRED: u64 = 4;
    const E_INVALID_QUANTITY: u64 = 5;

    // Constants for margin calculations
    const INITIAL_MARGIN_MULTIPLIER: u64 = 100; // 100% of position value
    const MAINTENANCE_MARGIN_MULTIPLIER: u64 = 80; // 80% of position value
    const AMERICAN_EARLY_EXERCISE_RISK_MULTIPLIER: u64 = 120; // 120% for American options

    // Position types
    const POSITION_TYPE_LONG: u8 = 0;
    const POSITION_TYPE_SHORT: u8 = 1;

    /// Represents a user's position in an options series
    struct Position has key, store, drop {
        account: address,
        series_id: u64,
        position_type: u8,
        quantity: u64, // Always positive, direction determined by position_type
        entry_price: u128,
        current_price: u128,
        unrealized_pnl: u64, // Can be negative, stored as absolute value with separate sign
        margin_required: u128,
        is_american_style: bool, // New: Track if this is American-style option
        last_updated: u64,
    }

    /// Portfolio summary for risk management
    struct PortfolioSummary has key, store, drop {
        total_positions: u64,
        total_long_quantity: u64,
        total_short_quantity: u64,
        total_unrealized_pnl: u64, // Absolute value
        total_margin_required: u128,
        total_available_margin: u128,
        risk_level: u8, // 0 = Low, 1 = Medium, 2 = High
    }

    /// Event emitted when a position is registered
    struct PositionRegisteredEvent has drop, store {
        account: address,
        series_id: u64,
        position_type: u8,
        quantity: u64,
        margin_required: u128,
        timestamp: u64,
    }

    /// Event emitted when margin is updated
    struct MarginUpdatedEvent has drop, store {
        account: address,
        series_id: u64,
        old_margin: u128,
        new_margin: u128,
        timestamp: u64,
    }

    /// Event emitted when a margin call is triggered
    struct MarginCallEvent has drop, store {
        account: address,
        series_id: u64,
        required_margin: u128,
        current_margin: u128,
        timestamp: u64,
    }

    /// Event emitted when a position is liquidated
    struct PositionLiquidatedEvent has drop, store {
        account: address,
        series_id: u64,
        quantity: u64,
        liquidation_price: u128,
        timestamp: u64,
    }

    /// Global margin engine state
    struct MarginEngine has key {
        positions: vector<Position>,
        portfolio_summaries: vector<PortfolioSummary>,
        position_registered_events: EventHandle<PositionRegisteredEvent>,
        margin_updated_events: EventHandle<MarginUpdatedEvent>,
        margin_call_events: EventHandle<MarginCallEvent>,
        liquidation_events: EventHandle<PositionLiquidatedEvent>,
    }

    /// Initialize the margin engine
    public fun initialize(account: &signer) {
        let margin_engine = MarginEngine {
            positions: vector::empty(),
            portfolio_summaries: vector::empty(),
            position_registered_events: event::new_event_handle<PositionRegisteredEvent>(account),
            margin_updated_events: event::new_event_handle<MarginUpdatedEvent>(account),
            margin_call_events: event::new_event_handle<MarginCallEvent>(account),
            liquidation_events: event::new_event_handle<PositionLiquidatedEvent>(account),
        };
        move_to(account, margin_engine);
    }

    /// Register a new position
    public fun register_position(
        account: address,
        series_id: u64,
        position_type: u8,
        quantity: u64,
        entry_price: u128,
        is_american_style: bool
    ) {
        // Validate position type
        assert!(position_type == POSITION_TYPE_LONG || position_type == POSITION_TYPE_SHORT, E_INVALID_POSITION_TYPE);
        assert!(quantity > 0, E_INVALID_QUANTITY);

        let current_price = price_oracle_adapter::get_current_price(series_id);
        let margin_required = calculate_position_margin(quantity, current_price, is_american_style);

        let position = Position {
            account,
            series_id,
            position_type,
            quantity,
            entry_price,
            current_price,
            unrealized_pnl: 0, // Will be calculated on first update
            margin_required,
            is_american_style,
            last_updated: timestamp::now_seconds(),
        };

        // Add to global positions
        let margin_engine = borrow_global_mut<MarginEngine>(@avila_protocol);
        vector::push_back(&mut margin_engine.positions, position);

        // Emit event
        event::emit_event(
            &mut margin_engine.position_registered_events,
            PositionRegisteredEvent {
                account,
                series_id,
                position_type,
                quantity,
                margin_required,
                timestamp: timestamp::now_seconds(),
            }
        );

        // Update portfolio summary
        update_portfolio_summary(account);
    }

    /// Calculate required margin for a position
    public fun calculate_position_margin(quantity: u64, current_price: u128, is_american_style: bool): u128 {
        let base_margin = (quantity as u128) * current_price / 1000000; // Assuming 6 decimal precision
        
        if (is_american_style) {
            // American options require additional margin for early exercise risk
            let american_style_margin = (base_margin * (AMERICAN_EARLY_EXERCISE_RISK_MULTIPLIER as u128)) / 100;
            base_margin + american_style_margin
        } else {
            base_margin
        }
    }

    /// Calculate margin for American-style options specifically
    public fun calculate_american_option_margin(quantity: u64, current_price: u128): u128 {
        let base_margin = (quantity as u128) * current_price / 1000000;
        let american_style_margin = (base_margin * (AMERICAN_EARLY_EXERCISE_RISK_MULTIPLIER as u128)) / 100;
        base_margin + american_style_margin
    }

    /// Update position margin based on current market conditions
    public fun update_position_margin(series_id: u64, account: address) {
        let margin_engine = borrow_global_mut<MarginEngine>(@avila_protocol);
        let i = 0;
        let len = vector::length(&margin_engine.positions);
        
        while (i < len) {
            let position = vector::borrow_mut(&mut margin_engine.positions, i);
            if (position.series_id == series_id && position.account == account) {
                let old_margin = position.margin_required;
                let current_price = price_oracle_adapter::get_current_price(series_id);
                let new_margin = calculate_position_margin(position.quantity, current_price, position.is_american_style);
                
                position.margin_required = new_margin;
                position.current_price = current_price;
                position.last_updated = timestamp::now_seconds();

                // Emit margin updated event
                event::emit_event(
                    &mut margin_engine.margin_updated_events,
                    MarginUpdatedEvent {
                        account,
                        series_id,
                        old_margin,
                        new_margin,
                        timestamp: timestamp::now_seconds(),
                    }
                );

                break
            };
            i = i + 1;
        };

        // Update portfolio summary
        update_portfolio_summary(account);
    }

    /// Check if a position meets margin requirements
    public fun check_margin_requirements(account: address): bool {
        if (exists<PortfolioSummary>(account)) {
            let portfolio = borrow_global<PortfolioSummary>(account);
            portfolio.total_available_margin >= portfolio.total_margin_required
        } else {
            true // No positions, so no margin requirements
        }
    }

    /// Trigger margin call if requirements not met
    public fun trigger_margin_call(account: address) {
        if (exists<PortfolioSummary>(account)) {
            let portfolio = borrow_global<PortfolioSummary>(account);
            if (portfolio.total_available_margin < portfolio.total_margin_required) {
                let margin_engine = borrow_global_mut<MarginEngine>(@avila_protocol);
                
                event::emit_event(
                    &mut margin_engine.margin_call_events,
                    MarginCallEvent {
                        account,
                        series_id: 0, // General margin call
                        required_margin: portfolio.total_margin_required,
                        current_margin: portfolio.total_available_margin,
                        timestamp: timestamp::now_seconds(),
                    }
                );
            };
        };
    }

    /// Liquidate a position that doesn't meet margin requirements
    public fun liquidate_position(series_id: u64, account: address) {
        let margin_engine = borrow_global_mut<MarginEngine>(@avila_protocol);
        let i = 0;
        let len = vector::length(&margin_engine.positions);
        
        while (i < len) {
            let position = vector::borrow_mut(&mut margin_engine.positions, i);
            if (position.series_id == series_id && position.account == account) {
                // Emit liquidation event
                event::emit_event(
                    &mut margin_engine.liquidation_events,
                    PositionLiquidatedEvent {
                        account,
                        series_id,
                        quantity: position.quantity,
                        liquidation_price: position.current_price,
                        timestamp: timestamp::now_seconds(),
                    }
                );

                // Remove position
                vector::remove(&mut margin_engine.positions, i);
                break
            };
            i = i + 1;
        };

        // Update portfolio summary
        update_portfolio_summary(account);
    }

    /// Get position information
    public fun get_position(series_id: u64, account: address): Option<Position> {
        let margin_engine = borrow_global<MarginEngine>(@avila_protocol);
        let i = 0;
        let len = vector::length(&margin_engine.positions);
        
        while (i < len) {
            let position = vector::borrow(&margin_engine.positions, i);
            if (position.series_id == series_id && position.account == account) {
                return option::some(*position)
            };
            i = i + 1;
        };
        
        option::none()
    }

    /// Get all positions for an account
    public fun get_account_positions(account: address): vector<Position> {
        let margin_engine = borrow_global<MarginEngine>(@avila_protocol);
        let positions = vector::empty();
        let i = 0;
        let len = vector::length(&margin_engine.positions);
        
        while (i < len) {
            let position = vector::borrow(&margin_engine.positions, i);
            if (position.account == account) {
                vector::push_back(&mut positions, *position);
            };
            i = i + 1;
        };
        
        positions
    }

    /// Update portfolio summary for an account
    fun update_portfolio_summary(account: address) {
        let positions = get_account_positions(account);
        let total_positions = vector::length(&positions);
        let total_long_quantity = 0u64;
        let total_short_quantity = 0u64;
        let total_unrealized_pnl = 0u64;
        let total_margin_required = 0u128;
        let total_available_margin = 0u128;
        let risk_level = 0u8;

        let i = 0;
        while (i < total_positions) {
            let position = vector::borrow(&positions, i);
            
            if (position.position_type == POSITION_TYPE_LONG) {
                total_long_quantity = total_long_quantity + position.quantity;
            } else {
                total_short_quantity = total_short_quantity + position.quantity;
            };
            
            total_unrealized_pnl = total_unrealized_pnl + position.unrealized_pnl;
            total_margin_required = total_margin_required + position.margin_required;
            
            i = i + 1;
        };

        // Calculate risk level based on leverage and concentration
        if (total_margin_required > 0) {
            let leverage_ratio = (total_long_quantity + total_short_quantity) * 100 / (total_margin_required as u64);
            if (leverage_ratio > 10) {
                risk_level = 2; // High risk
            } else if (leverage_ratio > 5) {
                risk_level = 1; // Medium risk
            } else {
                risk_level = 0; // Low risk
            };
        };

        let portfolio = PortfolioSummary {
            total_positions,
            total_long_quantity,
            total_short_quantity,
            total_unrealized_pnl,
            total_margin_required,
            total_available_margin,
            risk_level,
        };

        if (exists<PortfolioSummary>(account)) {
            let existing = borrow_global_mut<PortfolioSummary>(account);
            *existing = portfolio;
        } else {
            move_to(&get_account_signer(account), portfolio);
        };
    }

    /// Get portfolio summary
    public fun get_portfolio_summary(account: address): (u64, u64, u64, u64, u128, u128, u8) {
        if (exists<PortfolioSummary>(account)) {
            let portfolio = borrow_global<PortfolioSummary>(account);
            (
                portfolio.total_positions,
                portfolio.total_long_quantity,
                portfolio.total_short_quantity,
                portfolio.total_unrealized_pnl,
                portfolio.total_margin_required,
                portfolio.total_available_margin,
                portfolio.risk_level
            )
        } else {
            (0, 0, 0, 0, 0, 0, 0)
        }
    }

    /// Helper function to get account signer (placeholder)
    fun get_account_signer(account: address): &signer {
        // This is a placeholder - in practice, this would need to be implemented
        // based on the specific account management approach
        abort 0
    }

    /// Get total margin required across all positions
    public fun get_total_margin_required(): u128 {
        let margin_engine = borrow_global<MarginEngine>(@avila_protocol);
        let total = 0u128;
        let i = 0;
        let len = vector::length(&margin_engine.positions);
        
        while (i < len) {
            let position = vector::borrow(&margin_engine.positions, i);
            total = total + position.margin_required;
            i = i + 1;
        };
        
        total
    }

    /// Get total unrealized PnL across all positions
    public fun get_total_unrealized_pnl(): u64 {
        let margin_engine = borrow_global<MarginEngine>(@avila_protocol);
        let total = 0u64;
        let i = 0;
        let len = vector::length(&margin_engine.positions);
        
        while (i < len) {
            let position = vector::borrow(&margin_engine.positions, i);
            total = total + position.unrealized_pnl;
            i = i + 1;
        };
        
        total
    }

    /// Emergency function to reset margin engine (for testing)
    #[test_only]
    public fun reset_margin_engine() {
        if (exists<MarginEngine>(@avila_protocol)) {
            let margin_engine = move_from<MarginEngine>(@avila_protocol);
            // Drop the margin engine to reset state
        };
    }

    /// Test function to create a test position
    #[test_only]
    public fun create_test_position(
        account: &signer,
        series_id: u64,
        position_type: u8,
        quantity: u64,
        entry_price: u128
    ) {
        register_position(
            signer::address_of(account),
            series_id,
            position_type,
            quantity,
            entry_price,
            true // is_american_style
        );
    }
} 