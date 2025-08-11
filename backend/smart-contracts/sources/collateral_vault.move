module avila_protocol::collateral_vault {
    use std::signer;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;
    const E_VAULT_NOT_FOUND: u64 = 6;
    const E_INSUFFICIENT_COLLATERAL: u64 = 7;
    const E_INVALID_TOKEN: u64 = 8;

    /// Vault structure for managing collateral - matches scaffold exactly
    struct Vault has key, store {
        owner: address,
        collateral_token: address,
        deposited_amount: u128,
        locked_amount: u128
    }

    /// Protocol state
    struct CollateralVaultProtocol has key {
        admin: address,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct VaultCreatedEvent has drop, store {
        owner: address,
        collateral_token: address,
        timestamp: u64,
    }

    #[event]
    struct CollateralDepositedEvent has drop, store {
        owner: address,
        collateral_token: address,
        amount: u128,
        timestamp: u64,
    }

    #[event]
    struct CollateralWithdrawnEvent has drop, store {
        owner: address,
        collateral_token: address,
        amount: u128,
        timestamp: u64,
    }

    #[event]
    struct CollateralLockedEvent has drop, store {
        owner: address,
        amount: u128,
        timestamp: u64,
    }

    #[event]
    struct CollateralReleasedEvent has drop, store {
        owner: address,
        amount: u128,
        timestamp: u64,
    }

    #[event]
    struct VaultLiquidatedEvent has drop, store {
        owner: address,
        collateral_token: address,
        liquidated_amount: u128,
        timestamp: u64,
    }

    /// Initialize the CollateralVault module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<CollateralVaultProtocol>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, CollateralVaultProtocol {
            admin: account_addr,
            is_initialized: true,
        });
    }

    /// Create a new vault for a user
    public fun create_vault(
        account: &signer,
        collateral_token: address
    ) {
        let account_addr = signer::address_of(account);
        
        // Check if vault already exists
        assert!(!exists<Vault>(account_addr), E_ALREADY_INITIALIZED);

        // Create vault - matches scaffold exactly
        let vault = Vault {
            owner: account_addr,
            collateral_token,
            deposited_amount: 0,
            locked_amount: 0,
        };

        // Store vault
        move_to(account, vault);

        // Emit event
        let create_event = VaultCreatedEvent {
            owner: account_addr,
            collateral_token,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(create_event);
    }

    /// Deposit collateral into vault - matches scaffold signature
    public fun deposit_collateral(
        owner: address,
        token: address,
        amount: u128
    ) {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Get vault
        let vault = borrow_global_mut<Vault>(owner);
        assert!(vault.collateral_token == token, E_INVALID_TOKEN);

        // Update vault
        vault.deposited_amount = vault.deposited_amount + amount;

        // Emit event
        let deposit_event = CollateralDepositedEvent {
            owner,
            collateral_token: token,
            amount,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(deposit_event);
    }

    /// Withdraw collateral from vault - matches scaffold signature
    public fun withdraw_collateral(
        owner: address,
        token: address,
        amount: u128
    ) {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Get vault
        let vault = borrow_global_mut<Vault>(owner);
        assert!(vault.collateral_token == token, E_INVALID_TOKEN);
        assert!(vault.deposited_amount >= amount, E_INSUFFICIENT_BALANCE);

        // Update vault
        vault.deposited_amount = vault.deposited_amount - amount;

        // Emit event
        let withdraw_event = CollateralWithdrawnEvent {
            owner,
            collateral_token: token,
            amount,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(withdraw_event);
    }

    /// Lock collateral for position - matches scaffold signature
    public fun lock_for_position(
        owner: address,
        amount: u128
    ) {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Get vault
        let vault = borrow_global_mut<Vault>(owner);
        assert!(vault.deposited_amount >= amount, E_INSUFFICIENT_COLLATERAL);

        // Update vault
        vault.locked_amount = vault.locked_amount + amount;

        // Emit event
        let lock_event = CollateralLockedEvent {
            owner,
            amount,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(lock_event);
    }

    /// Release collateral after settlement - matches scaffold signature
    public fun release_after_settlement(
        owner: address,
        amount: u128
    ) {
        // Get vault
        let vault = borrow_global_mut<Vault>(owner);

        // Update vault
        vault.locked_amount = vault.locked_amount - amount;

        // Emit event
        let release_event = CollateralReleasedEvent {
            owner,
            amount,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(release_event);
    }

    /// Force liquidate vault - matches scaffold signature
    public fun force_liquidate(
        owner: address
    ) {
        // Get vault
        let vault = borrow_global_mut<Vault>(owner);

        // Mark as liquidated
        vault.locked_amount = 0;

        // Emit event
        let liquidate_event = VaultLiquidatedEvent {
            owner,
            collateral_token: vault.collateral_token,
            liquidated_amount: vault.deposited_amount + vault.locked_amount,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(liquidate_event);
    }

    /// Get vault information
    public fun get_vault_info(user: address): (address, u128, u128) {
        if (exists<Vault>(user)) {
            let vault = borrow_global<Vault>(user);
            (
                vault.collateral_token,
                vault.deposited_amount,
                vault.locked_amount,
            )
        } else {
            (@0x0, 0, 0)
        }
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<CollateralVaultProtocol>(@avila_protocol)
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        initialize(account);
    }

    #[test_only]
    public fun create_vault_for_test(
        account: &signer,
        collateral_token: address
    ) {
        create_vault(account, collateral_token)
    }
} 