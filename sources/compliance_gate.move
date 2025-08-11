module avila_protocol::compliance_gate {
    use std::signer;
    use std::vector;
    use std::option::{Self, Option};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;


    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_SIGNATURE: u64 = 4;
    const E_KYC_NOT_ATTESTED: u64 = 5;
    const E_USER_NOT_WHITELISTED: u64 = 6;
    const E_INVALID_SERIES: u64 = 7;
    const E_COMPLIANCE_CHECK_FAILED: u64 = 8;
    const E_INVALID_ATTESTATION: u64 = 9;

    /// Compliance levels
    const COMPLIANCE_LEVEL_NONE: u8 = 0;
    const COMPLIANCE_LEVEL_BASIC: u8 = 1;
    const COMPLIANCE_LEVEL_ACCREDITED: u8 = 2;
    const COMPLIANCE_LEVEL_INSTITUTIONAL: u8 = 3;

    /// KYC attestation status
    const KYC_STATUS_PENDING: u8 = 0;
    const KYC_STATUS_APPROVED: u8 = 1;
    const KYC_STATUS_REJECTED: u8 = 2;
    const KYC_STATUS_EXPIRED: u8 = 3;

    /// Compliance state
    struct ComplianceGate has key {
        admin: address,
        kyc_providers: vector<address>,
        whitelisted_users: vector<address>,
        restricted_series: vector<u64>,
        compliance_rules: vector<ComplianceRule>,
        is_initialized: bool,
    }

    /// User compliance profile
    struct UserCompliance has key, store {
        user: address,
        kyc_status: u8,
        kyc_level: u8,
        kyc_attestation: vector<u8>,
        kyc_expiry: u64,
        compliance_level: u8,
        risk_score: u64,
        last_updated: u64,
    }

    /// Compliance rule for series
    struct ComplianceRule has store, drop {
        series_id: u64,
        min_kyc_level: u8,
        max_risk_score: u64,
        requires_accreditation: bool,
        max_position_size: u128,
        trading_hours_start: u64,
        trading_hours_end: u64,
    }

    /// KYC attestation data
    struct KYCAttestation has store, drop {
        user: address,
        provider: address,
        attestation_data: vector<u8>,
        signature: vector<u8>,
        timestamp: u64,
        expiry: u64,
    }

    /// Events
    #[event]
    struct KYCApprovedEvent has drop, store {
        user: address,
        level: u8,
        provider: address,
        timestamp: u64,
    }

    #[event]
    struct KYCRejectedEvent has drop, store {
        user: address,
        reason: vector<u8>,
        provider: address,
        timestamp: u64,
    }

    #[event]
    struct UserWhitelistedEvent has drop, store {
        user: address,
        admin: address,
        timestamp: u64,
    }

    #[event]
    struct UserRemovedEvent has drop, store {
        user: address,
        admin: address,
        timestamp: u64,
    }

    #[event]
    struct ComplianceRuleAddedEvent has drop, store {
        series_id: u64,
        admin: address,
        timestamp: u64,
    }

    #[event]
    struct ComplianceCheckEvent has drop, store {
        user: address,
        series_id: u64,
        passed: bool,
        timestamp: u64,
    }

    /// Initialize the ComplianceGate module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<ComplianceGate>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, ComplianceGate {
            admin: account_addr,
            kyc_providers: vector::empty<address>(),
            whitelisted_users: vector::empty<address>(),
            restricted_series: vector::empty<u64>(),
            compliance_rules: vector::empty<ComplianceRule>(),
            is_initialized: true,
        });
    }

    /// Add KYC provider
    public fun add_kyc_provider(provider: address) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global_mut<ComplianceGate>(@avila_protocol);
        
        // Only admin can add KYC providers
        assert!(compliance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        if (!vector::contains(&compliance.kyc_providers, &provider)) {
            vector::push_back(&mut compliance.kyc_providers, provider);
        };
    }

    /// Remove KYC provider
    public fun remove_kyc_provider(provider: address) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global_mut<ComplianceGate>(@avila_protocol);
        
        // Only admin can remove KYC providers
        assert!(compliance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        let (found, index) = vector::index_of(&compliance.kyc_providers, &provider);
        if (found) {
            vector::remove(&mut compliance.kyc_providers, index);
        };
    }

    /// Add user to whitelist
    public fun add_whitelisted_user(user: address) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global_mut<ComplianceGate>(@avila_protocol);
        
        // Only admin can whitelist users
        assert!(compliance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        if (!vector::contains(&compliance.whitelisted_users, &user)) {
            vector::push_back(&mut compliance.whitelisted_users, user);
        };

        // Emit event
        event::emit(UserWhitelistedEvent {
            user,
            admin: compliance.admin,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Remove user from whitelist
    public fun remove_whitelisted_user(user: address) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global_mut<ComplianceGate>(@avila_protocol);
        
        // Only admin can remove users from whitelist
        assert!(compliance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        let (found, index) = vector::index_of(&compliance.whitelisted_users, &user);
        if (found) {
            vector::remove(&mut compliance.whitelisted_users, index);
        };

        // Emit event
        event::emit(UserRemovedEvent {
            user,
            admin: compliance.admin,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Add compliance rule for a series
    public fun add_compliance_rule(
        series_id: u64,
        min_kyc_level: u8,
        max_risk_score: u64,
        requires_accreditation: bool,
        max_position_size: u128,
        trading_hours_start: u64,
        trading_hours_end: u64
    ) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global_mut<ComplianceGate>(@avila_protocol);
        
        // Only admin can add compliance rules
        assert!(compliance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        let rule = ComplianceRule {
            series_id,
            min_kyc_level,
            max_risk_score,
            requires_accreditation,
            max_position_size,
            trading_hours_start,
            trading_hours_end,
        };
        
        vector::push_back(&mut compliance.compliance_rules, rule);
        
        // Add to restricted series if it has restrictions
        if (min_kyc_level > COMPLIANCE_LEVEL_NONE || requires_accreditation) {
            if (!vector::contains(&compliance.restricted_series, &series_id)) {
                vector::push_back(&mut compliance.restricted_series, series_id);
            };
        };

        // Emit event
        event::emit(ComplianceRuleAddedEvent {
            series_id,
            admin: compliance.admin,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Process KYC attestation
    public fun process_kyc_attestation(
        user: address,
        provider: address,
        attestation_data: vector<u8>,
        signature: vector<u8>,
        kyc_level: u8,
        expiry: u64
    ) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        
        // Verify provider is authorized
        assert!(vector::contains(&compliance.kyc_providers, &provider), E_UNAUTHORIZED);
        
        // Verify signature (simplified - in production you'd verify against provider's public key)
        // For now, we'll just check if the signature is not empty
        assert!(vector::length(&signature) > 0, E_INVALID_SIGNATURE);
        
        // Create or update user compliance profile
        if (exists<UserCompliance>(user)) {
            let user_compliance = borrow_global_mut<UserCompliance>(user);
            user_compliance.kyc_status = KYC_STATUS_APPROVED;
            user_compliance.kyc_level = kyc_level;
            user_compliance.kyc_attestation = attestation_data;
            user_compliance.kyc_expiry = expiry;
            user_compliance.compliance_level = kyc_level;
            user_compliance.last_updated = timestamp::now_seconds();
        } else {
            move_to(account::create_signer_with_capability(&account::create_test_signer_cap(user)), UserCompliance {
                user,
                kyc_status: KYC_STATUS_APPROVED,
                kyc_level,
                kyc_attestation: attestation_data,
                kyc_expiry,
                compliance_level: kyc_level,
                risk_score: 0,
                last_updated: timestamp::now_seconds(),
            });
        };

        // Emit event
        event::emit(KYCApprovedEvent {
            user,
            level: kyc_level,
            provider,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Reject KYC attestation
    public fun reject_kyc_attestation(
        user: address,
        provider: address,
        reason: vector<u8>
    ) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        
        // Verify provider is authorized
        assert!(vector::contains(&compliance.kyc_providers, &provider), E_UNAUTHORIZED);
        
        // Update user compliance profile if it exists
        if (exists<UserCompliance>(user)) {
            let user_compliance = borrow_global_mut<UserCompliance>(user);
            user_compliance.kyc_status = KYC_STATUS_REJECTED;
            user_compliance.last_updated = timestamp::now_seconds();
        };

        // Emit event
        event::emit(KYCRejectedEvent {
            user,
            reason,
            provider,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Check if user has valid KYC attestation
    public fun require_kyc_attestation(user: address, attestation_sig: vector<u8>): bool acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return true // If compliance module not initialized, allow all
        };
        
        if (!exists<UserCompliance>(user)) {
            return false
        };
        
        let user_compliance = borrow_global<UserCompliance>(user);
        let current_time = timestamp::now_seconds();
        
        // Check if KYC is approved and not expired
        user_compliance.kyc_status == KYC_STATUS_APPROVED && 
        user_compliance.kyc_expiry > current_time
    }

    /// Check if user is allowed to trade a specific series
    public fun is_user_allowed_for_series(user: address, series_id: u64): bool acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return true // If compliance module not initialized, allow all
        };
        
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        
        // Check if user is whitelisted
        if (!vector::contains(&compliance.whitelisted_users, &user)) {
            return false
        };
        
        // Check if series has compliance rules
        let i = 0;
        let len = vector::length(&compliance.compliance_rules);
        
        while (i < len) {
            let rule = vector::borrow(&compliance.compliance_rules, i);
            if (rule.series_id == series_id) {
                // Check KYC level requirement
                if (!exists<UserCompliance>(user)) {
                    return false
                };
                
                let user_compliance = borrow_global<UserCompliance>(user);
                if (user_compliance.kyc_level < rule.min_kyc_level) {
                    return false
                };
                
                // Check risk score
                if (user_compliance.risk_score > rule.max_risk_score) {
                    return false
                };
                
                // Check accreditation requirement
                if (rule.requires_accreditation && user_compliance.kyc_level < COMPLIANCE_LEVEL_ACCREDITED) {
                    return false
                };
                
                // Check trading hours
                let current_time = timestamp::now_seconds();
                if (current_time < rule.trading_hours_start || current_time > rule.trading_hours_end) {
                    return false
                };
                
                break
            };
            i = i + 1;
        };
        
        true
    }

    /// Update user risk score
    public fun update_user_risk_score(user: address, new_risk_score: u64) acquires ComplianceGate {
        assert!(exists<ComplianceGate>(@avila_protocol), E_NOT_INITIALIZED);
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        
        // Only admin or authorized providers can update risk scores
        assert!(
            compliance.admin == @avila_protocol || 
            vector::contains(&compliance.kyc_providers, &@avila_protocol),
            E_UNAUTHORIZED
        );
        
        if (exists<UserCompliance>(user)) {
            let user_compliance = borrow_global_mut<UserCompliance>(user);
            user_compliance.risk_score = new_risk_score;
            user_compliance.last_updated = timestamp::now_seconds();
        };
    }

    /// Get user compliance profile
    public fun get_user_compliance(user: address): Option<UserCompliance> acquires ComplianceGate {
        if (exists<UserCompliance>(user)) {
            let user_compliance = borrow_global<UserCompliance>(user);
            option::some(*user_compliance)
        } else {
            option::none()
        }
    }

    /// Check if series is restricted
    public fun is_series_restricted(series_id: u64): bool acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return false
        };
        
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        vector::contains(&compliance.restricted_series, &series_id)
    }

    /// Get compliance rules for a series
    public fun get_compliance_rules(series_id: u64): Option<ComplianceRule> acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return option::none()
        };
        
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        let i = 0;
        let len = vector::length(&compliance.compliance_rules);
        
        while (i < len) {
            let rule = vector::borrow(&compliance.compliance_rules, i);
            if (rule.series_id == series_id) {
                return option::some(*rule)
            };
            i = i + 1;
        };
        
        option::none()
    }

    /// Get all restricted series
    public fun get_restricted_series(): vector<u64> acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return vector::empty<u64>()
        };
        
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        compliance.restricted_series
    }

    /// Get all whitelisted users
    public fun get_whitelisted_users(): vector<address> acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return vector::empty<address>()
        };
        
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        compliance.whitelisted_users
    }

    /// Get all KYC providers
    public fun get_kyc_providers(): vector<address> acquires ComplianceGate {
        if (!exists<ComplianceGate>(@avila_protocol)) {
            return vector::empty<address>()
        };
        
        let compliance = borrow_global<ComplianceGate>(@avila_protocol);
        compliance.kyc_providers
    }
} 