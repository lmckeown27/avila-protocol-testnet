module avila_protocol::events_and_auditing {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_EVENT_TYPE: u64 = 4;

    /// Event types for categorization
    const EVENT_TYPE_SERIES: u8 = 0;
    const EVENT_TYPE_TRADING: u8 = 1;
    const EVENT_TYPE_SETTLEMENT: u8 = 2;
    const EVENT_TYPE_RISK: u8 = 3;
    const EVENT_TYPE_COMPLIANCE: u8 = 4;
    const EVENT_TYPE_GOVERNANCE: u8 = 5;

    /// Protocol state
    struct EventsAndAuditing has key {
        admin: address,
        event_counters: vector<u64>,
        audit_logs: vector<AuditLog>,
        max_audit_logs: u64,
        is_initialized: bool,
    }

    /// Audit log entry
    struct AuditLog has store, drop {
        id: u64,
        event_type: u8,
        user: address,
        action: vector<u8>,
        details: vector<u8>,
        timestamp: u64,
        block_height: u64,
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
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct OptionBoughtEvent has drop, store {
        series_id: u64,
        buyer: address,
        qty: u64,
        premium: u128,
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct OptionWrittenEvent has drop, store {
        series_id: u64,
        writer: address,
        qty: u64,
        premium_received: u128,
        collateral_locked: u128,
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct OptionExercisedEvent has drop, store {
        series_id: u64,
        holder: address,
        qty: u64,
        payout: u128,
        exercise_price: u128,
        timestamp: u64,
        event_id: u64,
    }

    /// American-style early exercise event
    #[event]
    struct AmericanEarlyExerciseEvent has drop, store {
        series_id: u64,
        holder: address,
        qty: u64,
        exercise_price: u128,
        payout: u128,
        is_early_exercise: bool,
        time_to_expiry: u64,
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct SettlementEvent has drop, store {
        series_id: u64,
        settlement_type: u8, // 0 = cash, 1 = physical, 2 = American early exercise
        total_payout: u128,
        participants_count: u64,
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct RiskEvent has drop, store {
        event_type: u8, // 0 = margin_call, 1 = liquidation, 2 = position_limit
        user: address,
        series_id: u64,
        details: vector<u8>,
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct ComplianceEvent has drop, store {
        event_type: u8, // 0 = kyc_approved, 1 = kyc_rejected, 2 = trading_suspended
        user: address,
        series_id: u64,
        details: vector<u8>,
        timestamp: u64,
        event_id: u64,
    }

    #[event]
    struct GovernanceEvent has drop, store {
        event_type: u8, // 0 = parameter_update, 1 = module_pause, 2 = role_change
        admin: address,
        details: vector<u8>,
        timestamp: u64,
        event_id: u64,
    }

    /// Initialize the EventsAndAuditing module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<EventsAndAuditing>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        // Initialize event counters for each event type
        let counters = vector::empty<u64>();
        let i = 0;
        while (i < 6) { // 6 event types
            vector::push_back(&mut counters, 0u64);
            i = i + 1;
        };
        
        move_to(account, EventsAndAuditing {
            admin: account_addr,
            event_counters: counters,
            audit_logs: vector::empty<AuditLog>(),
            max_audit_logs: 10000, // Keep last 10k audit logs
            is_initialized: true,
        });
    }

    /// Emit series created event
    public fun emit_series_created(
        series_id: u64,
        underlying_asset: address,
        strike_price: u128,
        expiry: u64,
        option_type: u8,
        contract_size: u64,
        settlement_style: u8,
        issuer: address
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_SERIES as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(SeriesCreatedEvent {
            series_id,
            underlying_asset,
            strike_price,
            expiry,
            option_type,
            contract_size,
            settlement_style,
            issuer,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_SERIES,
            issuer,
            b"series_created",
            b"",
            events
        );
    }

    /// Emit option bought event
    public fun emit_option_bought(
        series_id: u64,
        buyer: address,
        qty: u64,
        premium: u128
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_TRADING as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(OptionBoughtEvent {
            series_id,
            buyer,
            qty,
            premium,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_TRADING,
            buyer,
            b"option_bought",
            b"",
            events
        );
    }

    /// Emit option written event
    public fun emit_option_written(
        series_id: u64,
        writer: address,
        qty: u64,
        premium_received: u128,
        collateral_locked: u128
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_TRADING as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(OptionWrittenEvent {
            series_id,
            writer,
            qty,
            premium_received,
            collateral_locked,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_TRADING,
            writer,
            b"option_written",
            b"",
            events
        );
    }

    /// Emit option exercised event
    public fun emit_exercised(
        series_id: u64,
        holder: address,
        qty: u64,
        payout: u128,
        exercise_price: u128
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_TRADING as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(OptionExercisedEvent {
            series_id,
            holder,
            qty,
            payout,
            exercise_price,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_TRADING,
            holder,
            b"option_exercised",
            b"",
            events
        );
    }

    /// Emit settlement event
    public fun emit_settlement(
        series_id: u64,
        settlement_type: u8,
        total_payout: u128,
        participants_count: u64
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_SETTLEMENT as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(SettlementEvent {
            series_id,
            settlement_type,
            total_payout,
            participants_count,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_SETTLEMENT,
            @avila_protocol, // System event
            b"settlement_completed",
            b"",
            events
        );
    }

    /// Emit American-style early exercise event
    public fun emit_american_early_exercise(
        series_id: u64,
        holder: address,
        qty: u64,
        exercise_price: u128
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_TRADING as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Calculate time to expiry (simplified - would need series info in production)
        let current_time = timestamp::now_seconds();
        let time_to_expiry = 0; // Placeholder - would get from series info
        
        // Emit event
        event::emit(AmericanEarlyExerciseEvent {
            series_id,
            holder,
            qty,
            exercise_price,
            payout: 0, // Placeholder - would calculate actual payout
            is_early_exercise: true,
            time_to_expiry,
            timestamp: current_time,
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_TRADING,
            holder,
            b"american_early_exercise",
            b"",
            events
        );
    }

    /// Emit risk event
    public fun emit_risk_event(
        event_type: u8,
        user: address,
        series_id: u64,
        details: vector<u8>
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_RISK as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(RiskEvent {
            event_type,
            user,
            series_id,
            details,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_RISK,
            user,
            b"risk_event",
            details,
            events
        );
    }

    /// Emit compliance event
    public fun emit_compliance_event(
        event_type: u8,
        user: address,
        series_id: u64,
        details: vector<u8>
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_COMPLIANCE as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(ComplianceEvent {
            event_type,
            user,
            series_id,
            details,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_COMPLIANCE,
            user,
            b"compliance_event",
            details,
            events
        );
    }

    /// Emit governance event
    public fun emit_governance_event(
        event_type: u8,
        admin: address,
        details: vector<u8>
    ) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Increment event counter
        let counter = vector::borrow_mut(&mut events.event_counters, (EVENT_TYPE_GOVERNANCE as u64));
        *counter = *counter + 1;
        let event_id = *counter;
        
        // Emit event
        event::emit(GovernanceEvent {
            event_type,
            admin,
            details,
            timestamp: timestamp::now_seconds(),
            event_id,
        });
        
        // Add to audit log
        add_audit_log(
            EVENT_TYPE_GOVERNANCE,
            admin,
            b"governance_event",
            details,
            events
        );
    }

    /// Add entry to audit log
    fun add_audit_log(
        event_type: u8,
        user: address,
        action: vector<u8>,
        details: vector<u8>,
        events: &mut EventsAndAuditing
    ) {
        let audit_log = AuditLog {
            id: vector::length(&events.audit_logs),
            event_type,
            user,
            action,
            details,
            timestamp: timestamp::now_seconds(),
            block_height: 0, // In production, you'd get this from the blockchain
        };
        
        vector::push_back(&mut events.audit_logs, audit_log);
        
        // Maintain max audit log size
        if (vector::length(&events.audit_logs) > events.max_audit_logs) {
            vector::remove(&mut events.audit_logs, 0);
        };
    }

    /// Get event counter for a specific event type
    public fun get_event_counter(event_type: u8): u64 acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global<EventsAndAuditing>(@avila_protocol);
        assert!((event_type as u64) < vector::length(&events.event_counters), E_INVALID_EVENT_TYPE);
        *vector::borrow(&events.event_counters, (event_type as u64))
    }

    /// Get all event counters
    public fun get_all_event_counters(): vector<u64> acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global<EventsAndAuditing>(@avila_protocol);
        events.event_counters
    }

    /// Get audit logs for a specific user
    public fun get_user_audit_logs(user: address): vector<AuditLog> acquires EventsAndAuditing {
        if (!exists<EventsAndAuditing>(@avila_protocol)) {
            return vector::empty<AuditLog>()
        };
        
        let events = borrow_global<EventsAndAuditing>(@avila_protocol);
        let user_logs = vector::empty<AuditLog>();
        let i = 0;
        let len = vector::length(&events.audit_logs);
        
        while (i < len) {
            let log = vector::borrow(&events.audit_logs, i);
            if (log.user == user) {
                vector::push_back(&mut user_logs, *log);
            };
            i = i + 1;
        };
        
        user_logs
    }

    /// Get audit logs for a specific event type
    public fun get_event_type_audit_logs(event_type: u8): vector<AuditLog> acquires EventsAndAuditing {
        if (!exists<EventsAndAuditing>(@avila_protocol)) {
            return vector::empty<AuditLog>()
        };
        
        let events = borrow_global<EventsAndAuditing>(@avila_protocol);
        let type_logs = vector::empty<AuditLog>();
        let i = 0;
        let len = vector::length(&events.audit_logs);
        
        while (i < len) {
            let log = vector::borrow(&events.audit_logs, i);
            if (log.event_type == event_type) {
                vector::push_back(&mut type_logs, *log);
            };
            i = i + 1;
        };
        
        type_logs
    }

    /// Get recent audit logs (last N entries)
    public fun get_recent_audit_logs(count: u64): vector<AuditLog> acquires EventsAndAuditing {
        if (!exists<EventsAndAuditing>(@avila_protocol)) {
            return vector::empty<AuditLog>()
        };
        
        let events = borrow_global<EventsAndAuditing>(@avila_protocol);
        let total_logs = vector::length(&events.audit_logs);
        let start_index = if (total_logs > count) { total_logs - count } else { 0 };
        let recent_logs = vector::empty<AuditLog>();
        let i = start_index;
        
        while (i < total_logs) {
            let log = vector::borrow(&events.audit_logs, i);
            vector::push_back(&mut recent_logs, *log);
            i = i + 1;
        };
        
        recent_logs
    }

    /// Get total audit log count
    public fun get_total_audit_logs(): u64 acquires EventsAndAuditing {
        if (!exists<EventsAndAuditing>(@avila_protocol)) {
            return 0
        };
        
        let events = borrow_global<EventsAndAuditing>(@avila_protocol);
        vector::length(&events.audit_logs)
    }

    /// Update max audit log size
    public fun update_max_audit_logs(new_max: u64) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Only admin can update max audit log size
        assert!(events.admin == @avila_protocol, E_UNAUTHORIZED);
        
        events.max_audit_logs = new_max;
    }

    /// Clear old audit logs (keep only recent ones)
    public fun clear_old_audit_logs(keep_count: u64) acquires EventsAndAuditing {
        assert!(exists<EventsAndAuditing>(@avila_protocol), E_NOT_INITIALIZED);
        let events = borrow_global_mut<EventsAndAuditing>(@avila_protocol);
        
        // Only admin can clear audit logs
        assert!(events.admin == @avila_protocol, E_UNAUTHORIZED);
        
        let total_logs = vector::length(&events.audit_logs);
        if (total_logs > keep_count) {
            let remove_count = total_logs - keep_count;
            let i = 0;
            while (i < remove_count) {
                vector::remove(&mut events.audit_logs, 0);
                i = i + 1;
            };
        };
    }
} 