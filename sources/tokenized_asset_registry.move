module avila_protocol::tokenized_asset_registry {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_ASSET_NOT_FOUND: u64 = 3;
    const E_ASSET_ALREADY_EXISTS: u64 = 4;
    const E_INVALID_PARAMETERS: u64 = 5;
    const E_UNAUTHORIZED: u64 = 6;

    // Constants
    const MAX_SYMBOL_LENGTH: u64 = 10;
    const MAX_NAME_LENGTH: u64 = 100;
    const MAX_DECIMALS: u8 = 18;

    // Struct for tokenized asset information
    struct TokenizedAsset has store, drop {
        issuer: address,
        symbol: String,
        name: String,
        total_supply: u64,
        decimals: u8,
        created_at: u64,
        is_active: bool,
    }

    // Struct for asset metadata
    struct AssetMetadata has store, drop {
        description: String,
        sector: String,
        country: String,
        regulatory_status: u8, // 0=Unknown, 1=Approved, 2=Pending, 3=Rejected
    }

    // Main registry storage
    struct TokenizedAssetRegistry has key {
        assets: vector<TokenizedAsset>,
        asset_map: std::table::Table<address, u64>, // issuer -> index
        metadata: std::table::Table<address, AssetMetadata>,
        total_assets: u64,
        admin: address,
        initialized: bool,
    }

    // Events
    struct AssetRegisteredEvent has drop, store {
        issuer: address,
        symbol: String,
        name: String,
        total_supply: u64,
        timestamp: u64,
    }

    struct AssetUpdatedEvent has drop, store {
        issuer: address,
        symbol: String,
        timestamp: u64,
    }

    struct AssetDeactivatedEvent has drop, store {
        issuer: address,
        symbol: String,
        timestamp: u64,
    }

    // Event handles
    struct TokenizedAssetEvents has key {
        asset_registered_events: EventHandle<AssetRegisteredEvent>,
        asset_updated_events: EventHandle<AssetUpdatedEvent>,
        asset_deactivated_events: EventHandle<AssetDeactivatedEvent>,
    }

    // Initialize the registry
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<TokenizedAssetRegistry>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        // Create registry
        move_to(account, TokenizedAssetRegistry {
            assets: vector::empty(),
            asset_map: std::table::new(),
            metadata: std::table::new(),
            total_assets: 0,
            admin: account_addr,
            initialized: true,
        });

        // Create event handles
        move_to(account, TokenizedAssetEvents {
            asset_registered_events: event::new_event_handle<AssetRegisteredEvent>(account),
            asset_updated_events: event::new_event_handle<AssetUpdatedEvent>(account),
            asset_deactivated_events: event::new_event_handle<AssetDeactivatedEvent>(account),
        });
    }

    // Test initialization
    public fun initialize_for_test(admin: &signer) {
        initialize(admin);
    }

    // Register a new tokenized asset
    public fun register_tokenized_asset(
        issuer: address,
        symbol: vector<u8>,
        name: vector<u8>,
        ticker: vector<u8>,
        total_supply: u64,
        decimals: u8
    ): u64 {
        // Validate parameters
        assert!(vector::length(&symbol) <= MAX_SYMBOL_LENGTH, E_INVALID_PARAMETERS);
        assert!(vector::length(&name) <= MAX_NAME_LENGTH, E_INVALID_PARAMETERS);
        assert!(vector::length(&ticker) <= MAX_SYMBOL_LENGTH, E_INVALID_PARAMETERS);
        assert!(decimals <= MAX_DECIMALS, E_INVALID_PARAMETERS);
        assert!(total_supply > 0, E_INVALID_PARAMETERS);

        // Check if asset already exists
        assert!(!std::table::contains(&get_registry().asset_map, issuer), E_ASSET_ALREADY_EXISTS);

        let registry = borrow_global_mut<TokenizedAssetRegistry>(@avila_protocol);
        
        // Create asset
        let asset = TokenizedAsset {
            issuer,
            symbol: string::utf8(symbol),
            name: string::utf8(name),
            total_supply,
            decimals,
            created_at: timestamp::now_seconds(),
            is_active: true,
        };

        // Add to registry
        let asset_index = vector::length(&registry.assets);
        vector::push_back(&mut registry.assets, asset);
        std::table::add(&mut registry.asset_map, issuer, asset_index);
        registry.total_assets = registry.total_assets + 1;

        // Emit event
        let events = borrow_global_mut<TokenizedAssetEvents>(@avila_protocol);
        event::emit_event(&mut events.asset_registered_events, AssetRegisteredEvent {
            issuer,
            symbol: string::utf8(symbol),
            name: string::utf8(name),
            total_supply,
            timestamp: timestamp::now_seconds(),
        });

        asset_index
    }

    // Get tokenized asset by issuer address
    public fun get_tokenized_asset(issuer: address): Option<TokenizedAsset> {
        if (!exists<TokenizedAssetRegistry>(@avila_protocol)) {
            return option::none();
        };

        let registry = borrow_global<TokenizedAssetRegistry>(@avila_protocol);
        
        if (!std::table::contains(&registry.asset_map, issuer)) {
            return option::none();
        };

        let index = *std::table::borrow(&registry.asset_map, issuer);
        let asset = vector::borrow(&registry.assets, index);
        
        option::some(*asset)
    }

    // Get asset by index
    public fun get_asset_by_index(index: u64): Option<TokenizedAsset> {
        if (!exists<TokenizedAssetRegistry>(@avila_protocol)) {
            return option::none();
        };

        let registry = borrow_global<TokenizedAssetRegistry>(@avila_protocol);
        
        if (index >= vector::length(&registry.assets)) {
            return option::none();
        };

        let asset = vector::borrow(&registry.assets, index);
        option::some(*asset)
    }

    // Update asset metadata
    public fun update_asset_metadata(
        issuer: address,
        description: vector<u8>,
        sector: vector<u8>,
        country: vector<u8>,
        regulatory_status: u8
    ) {
        assert!(exists<TokenizedAssetRegistry>(@avila_protocol), E_NOT_INITIALIZED);
        assert!(std::table::contains(&get_registry().asset_map, issuer), E_ASSET_NOT_FOUND);

        let registry = borrow_global_mut<TokenizedAssetRegistry>(@avila_protocol);
        
        let metadata = AssetMetadata {
            description: string::utf8(description),
            sector: string::utf8(sector),
            country: string::utf8(country),
            regulatory_status,
        };

        if (std::table::contains(&registry.metadata, issuer)) {
            std::table::set(&mut registry.metadata, issuer, metadata);
        } else {
            std::table::add(&mut registry.metadata, issuer, metadata);
        };

        // Emit update event
        let events = borrow_global_mut<TokenizedAssetEvents>(@avila_protocol);
        let asset = get_tokenized_asset(issuer);
        if (option::is_some(&asset)) {
            let asset_data = option::borrow(&asset, 0);
            event::emit_event(&mut events.asset_updated_events, AssetUpdatedEvent {
                issuer,
                symbol: asset_data.symbol,
                timestamp: timestamp::now_seconds(),
            });
        };
    }

    // Deactivate asset
    public fun deactivate_asset(issuer: address) {
        assert!(exists<TokenizedAssetRegistry>(@avila_protocol), E_NOT_INITIALIZED);
        assert!(std::table::contains(&get_registry().asset_map, issuer), E_ASSET_NOT_FOUND);

        let registry = borrow_global_mut<TokenizedAssetRegistry>(@avila_protocol);
        let index = *std::table::borrow(&registry.asset_map, issuer);
        let asset = vector::borrow_mut(&mut registry.assets, index);
        
        asset.is_active = false;

        // Emit deactivation event
        let events = borrow_global_mut<TokenizedAssetEvents>(@avila_protocol);
        event::emit_event(&mut events.asset_deactivated_events, AssetDeactivatedEvent {
            issuer,
            symbol: asset.symbol,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Get total number of assets
    public fun get_total_assets(): u64 {
        if (!exists<TokenizedAssetRegistry>(@avila_protocol)) {
            return 0;
        };
        get_registry().total_assets
    }

    // Check if asset exists and is active
    public fun is_asset_active(issuer: address): bool {
        let asset = get_tokenized_asset(issuer);
        if (option::is_none(&asset)) {
            return false;
        };
        let asset_data = option::borrow(&asset, 0);
        asset_data.is_active
    }

    // Get registry reference
    fun get_registry(): &TokenizedAssetRegistry {
        borrow_global<TokenizedAssetRegistry>(@avila_protocol)
    }

    // Test functions
    #[test_only]
    public fun test_register_asset(): u64 {
        let admin = account::create_account_for_test(@avila_protocol);
        initialize_for_test(&admin);
        
        let asset_index = register_tokenized_asset(
            @0x123,
            b"TEST",
            b"Test Asset",
            b"TA",
            1000000,
            8
        );
        
        assert!(asset_index == 0, 0);
        assert!(get_total_assets() == 1, 1);
        assert!(is_asset_active(@0x123), 2);
        
        account::destroy_signer(admin);
        asset_index
    }

    #[test_only]
    public fun test_get_asset() {
        let admin = account::create_account_for_test(@avila_protocol);
        initialize_for_test(&admin);
        
        register_tokenized_asset(
            @0x456,
            b"STOCK",
            b"Stock Asset",
            b"SA",
            500000,
            6
        );
        
        let asset = get_tokenized_asset(@0x456);
        assert!(option::is_some(&asset), 0);
        
        let asset_data = option::borrow(&asset, 0);
        assert!(asset_data.symbol == string::utf8(b"STOCK"), 1);
        assert!(asset_data.total_supply == 500000, 2);
        
        account::destroy_signer(admin);
    }
} 