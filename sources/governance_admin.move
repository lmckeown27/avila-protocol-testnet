module avila_protocol::governance_admin {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_ROLE: u64 = 4;
    const E_INVALID_PARAMETER: u64 = 5;
    const E_MODULE_NOT_FOUND: u64 = 6;
    const E_MODULE_ALREADY_PAUSED: u64 = 7;
    const E_MODULE_NOT_PAUSED: u64 = 8;

    /// Role constants
    const ROLE_ADMIN: u8 = 0;
    const ROLE_OPERATOR: u8 = 1;
    const ROLE_GUARDIAN: u8 = 2;

    /// Protocol parameters
    const PARAM_MIN_STRIKE_PRICE: u64 = 0;
    const PARAM_MAX_STRIKE_PRICE: u64 = 1;
    const PARAM_MIN_CONTRACT_SIZE: u64 = 2;
    const PARAM_MAX_CONTRACT_SIZE: u64 = 3;
    const PARAM_MIN_EXPIRY_DAYS: u64 = 4;
    const PARAM_MAX_EXPIRY_DAYS: u64 = 5;
    const PARAM_MARGIN_REQUIREMENT: u64 = 6;
    const PARAM_LIQUIDATION_THRESHOLD: u64 = 7;

    /// Governance state
    struct GovernanceAdmin has key {
        admin: address,
        operators: vector<address>,
        guardians: vector<address>,
        parameters: vector<u128>,
        paused_modules: vector<vector<u8>>,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct RoleAddedEvent has drop, store {
        role: u8,
        addr: address,
        timestamp: u64,
    }

    #[event]
    struct RoleRemovedEvent has drop, store {
        role: u8,
        addr: address,
        timestamp: u64,
    }

    #[event]
    struct ParameterUpdatedEvent has drop, store {
        param: vector<u8>,
        old_value: u128,
        new_value: u128,
        timestamp: u64,
    }

    #[event]
    struct ModulePausedEvent has drop, store {
        module_name: vector<u8>,
        timestamp: u64,
    }

    #[event]
    struct ModuleUnpausedEvent has drop, store {
        module_name: vector<u8>,
        timestamp: u64,
    }

    /// Initialize the GovernanceAdmin module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<GovernanceAdmin>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        // Initialize default parameters
        let default_params = vector::empty<u128>();
        vector::push_back(&mut default_params, 1000u128);      // MIN_STRIKE_PRICE
        vector::push_back(&mut default_params, 1000000000u128); // MAX_STRIKE_PRICE
        vector::push_back(&mut default_params, 1u128);         // MIN_CONTRACT_SIZE
        vector::push_back(&mut default_params, 10000u128);     // MAX_CONTRACT_SIZE
        vector::push_back(&mut default_params, 1u128);         // MIN_EXPIRY_DAYS
        vector::push_back(&mut default_params, 365u128);       // MAX_EXPIRY_DAYS
        vector::push_back(&mut default_params, 150000u128);    // MARGIN_REQUIREMENT (150%)
        vector::push_back(&mut default_params, 120000u128);    // LIQUIDATION_THRESHOLD (120%)

        move_to(account, GovernanceAdmin {
            admin: account_addr,
            operators: vector::empty<address>(),
            guardians: vector::empty<address>(),
            parameters: default_params,
            paused_modules: vector::empty<vector<u8>>(),
            is_initialized: true,
        });
    }

    /// Add an authorized role
    public fun add_authorized_role(role: u8, addr: address) acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global_mut<GovernanceAdmin>(@avila_protocol);
        
        // Only admin can add roles
        assert!(governance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        // Validate role
        assert!(role <= ROLE_GUARDIAN, E_INVALID_ROLE);
        
        // Add to appropriate role list
        if (role == ROLE_OPERATOR) {
            if (!vector::contains(&governance.operators, &addr)) {
                vector::push_back(&mut governance.operators, addr);
            };
        } else if (role == ROLE_GUARDIAN) {
            if (!vector::contains(&governance.guardians, &addr)) {
                vector::push_back(&mut governance.guardians, addr);
            };
        };

        // Emit event
        event::emit(RoleAddedEvent {
            role,
            addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Remove an authorized role
    public fun remove_authorized_role(role: u8, addr: address) acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global_mut<GovernanceAdmin>(@avila_protocol);
        
        // Only admin can remove roles
        assert!(governance.admin == @avila_protocol, E_UNAUTHORIZED);
        
        // Validate role
        assert!(role <= ROLE_GUARDIAN, E_INVALID_ROLE);
        
        // Remove from appropriate role list
        if (role == ROLE_OPERATOR) {
            let (found, index) = vector::index_of(&governance.operators, &addr);
            if (found) {
                vector::remove(&mut governance.operators, index);
            };
        } else if (role == ROLE_GUARDIAN) {
            let (found, index) = vector::index_of(&governance.guardians, &addr);
            if (found) {
                vector::remove(&mut governance.guardians, index);
            };
        };

        // Emit event
        event::emit(RoleRemovedEvent {
            role,
            addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Update a protocol parameter
    public fun update_parameter(param: vector<u8>, value: u128) acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global_mut<GovernanceAdmin>(@avila_protocol);
        
        // Only admin or operators can update parameters
        let caller = @avila_protocol;
        assert!(
            governance.admin == caller || 
            vector::contains(&governance.operators, &caller),
            E_UNAUTHORIZED
        );
        
        // Parse parameter index from string
        let param_index = parse_parameter_index(param);
        assert!(param_index < vector::length(&governance.parameters), E_INVALID_PARAMETER);
        
        // Get old value and update
        let old_value = *vector::borrow(&governance.parameters, param_index);
        *vector::borrow_mut(&mut governance.parameters, param_index) = value;
        
        // Emit event
        event::emit(ParameterUpdatedEvent {
            param,
            old_value,
            new_value: value,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Pause a module
    public fun pause_module(module_name: vector<u8>) acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global_mut<GovernanceAdmin>(@avila_protocol);
        
        // Only admin or guardians can pause modules
        let caller = @avila_protocol;
        assert!(
            governance.admin == caller || 
            vector::contains(&governance.guardians, &caller),
            E_UNAUTHORIZED
        );
        
        // Check if module is already paused
        assert!(!vector::contains(&governance.paused_modules, &module_name), E_MODULE_ALREADY_PAUSED);
        
        // Add to paused modules
        vector::push_back(&mut governance.paused_modules, module_name);
        
        // Emit event
        event::emit(ModulePausedEvent {
            module_name,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Unpause a module
    public fun unpause_module(module_name: vector<u8>) acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global_mut<GovernanceAdmin>(@avila_protocol);
        
        // Only admin can unpause modules
        let caller = @avila_protocol;
        assert!(governance.admin == caller, E_UNAUTHORIZED);
        
        // Check if module is paused
        let (found, index) = vector::index_of(&governance.paused_modules, &module_name);
        assert!(found, E_MODULE_NOT_PAUSED);
        
        // Remove from paused modules
        vector::remove(&mut governance.paused_modules, index);
        
        // Emit event
        event::emit(ModuleUnpausedEvent {
            module_name,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Check if a module is paused
    public fun is_module_paused(module_name: vector<u8>): bool acquires GovernanceAdmin {
        if (!exists<GovernanceAdmin>(@avila_protocol)) {
            return false
        };
        
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        vector::contains(&governance.paused_modules, &module_name)
    }

    /// Check if caller has admin role
    public fun is_admin(caller: address): bool acquires GovernanceAdmin {
        if (!exists<GovernanceAdmin>(@avila_protocol)) {
            return false
        };
        
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        governance.admin == caller
    }

    /// Check if caller has operator role
    public fun is_operator(caller: address): bool acquires GovernanceAdmin {
        if (!exists<GovernanceAdmin>(@avila_protocol)) {
            return false
        };
        
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        governance.admin == caller || vector::contains(&governance.operators, &caller)
    }

    /// Check if caller has guardian role
    public fun is_guardian(caller: address): bool acquires GovernanceAdmin {
        if (!exists<GovernanceAdmin>(@avila_protocol)) {
            return false
        };
        
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        governance.admin == caller || vector::contains(&governance.guardians, &caller)
    }

    /// Get parameter value
    public fun get_parameter(param_index: u64): u128 acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        assert!(param_index < vector::length(&governance.parameters), E_INVALID_PARAMETER);
        *vector::borrow(&governance.parameters, param_index)
    }

    /// Helper function to parse parameter index from string
    fun parse_parameter_index(param: vector<u8>): u64 {
        // Simple parsing - convert string to u64
        // In production, you might want more sophisticated parsing
        let result = 0u64;
        let i = 0;
        let len = vector::length(&param);
        
        while (i < len) {
            let char = *vector::borrow(&param, i);
            if (char >= 48 && char <= 57) { // ASCII 0-9
                result = result * 10 + ((char as u64) - 48);
            };
            i = i + 1;
        };
        
        result
    }

    /// Get all paused modules
    public fun get_paused_modules(): vector<vector<u8>> acquires GovernanceAdmin {
        if (!exists<GovernanceAdmin>(@avila_protocol)) {
            return vector::empty<vector<u8>>()
        };
        
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        governance.paused_modules
    }

    /// Get governance info
    public fun get_governance_info(): (address, vector<address>, vector<address>) acquires GovernanceAdmin {
        assert!(exists<GovernanceAdmin>(@avila_protocol), E_NOT_INITIALIZED);
        let governance = borrow_global<GovernanceAdmin>(@avila_protocol);
        (governance.admin, governance.operators, governance.guardians)
    }
} 