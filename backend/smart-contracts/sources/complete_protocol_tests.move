#[test_only]
module avila_protocol::complete_protocol_tests {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    
    // Core modules
    use avila_protocol::avila_protocol;
    use avila_protocol::options_core;
    use avila_protocol::collateral_vault;
    use avila_protocol::margin_engine;
    use avila_protocol::price_oracle_adapter;
    use avila_protocol::settlement_engine;
    use avila_protocol::order_book;
    use avila_protocol::governance_admin;
    use avila_protocol::compliance_gate;
    use avila_protocol::events_and_auditing;
    use avila_protocol::tokenized_asset_registry;

    /// Test accounts
    const ADMIN: address = @avila_protocol;
    const USER1: address = @0x111;
    const USER2: address = @0x222;
    const USER3: address = @0x333;
    const KYC_PROVIDER: address = @0x444;
    const ASSET_ISSUER: address = @0x555;

    /// Test constants
    const STRIKE_PRICE: u128 = 50000; // $50.00
    const EXPIRY_DAYS: u64 = 30;
    const CONTRACT_SIZE: u64 = 100;
    const QUANTITY: u64 = 10;
    const PREMIUM: u128 = 5000; // $5.00 per contract

    /// Test setup
    fun setup_test(): signer {
        let admin = account::create_account_for_test(ADMIN);
        let user1 = account::create_account_for_test(USER1);
        let user2 = account::create_account_for_test(USER2);
        let user3 = account::create_account_for_test(USER3);
        let kyc_provider = account::create_account_for_test(KYC_PROVIDER);
        let asset_issuer = account::create_account_for_test(ASSET_ISSUER);
        
        // Initialize the complete protocol
        avila_protocol::initialize(&admin);
        
        // Setup test environment
        setup_test_environment(&admin, &user1, &user2, &user3, &kyc_provider, &asset_issuer);
        
        admin
    }

    /// Setup test environment
    fun setup_test_environment(
        admin: &signer,
        user1: &signer,
        user2: &signer,
        user3: &signer,
        kyc_provider: &signer,
        asset_issuer: &signer
    ) {
        // Add KYC provider
        governance_admin::add_authorized_role(2, KYC_PROVIDER); // Guardian role
        
        // Add users to whitelist
        compliance_gate::add_whitelisted_user(USER1);
        compliance_gate::add_whitelisted_user(USER2);
        compliance_gate::add_whitelisted_user(USER3);
        
        // Process KYC attestations
        compliance_gate::process_kyc_attestation(
            USER1,
            KYC_PROVIDER,
            b"kyc_attestation_user1",
            b"signature1",
            2, // Accredited level
            365 * 24 * 60 * 60 // 1 year expiry
        );
        
        compliance_gate::process_kyc_attestation(
            USER2,
            KYC_PROVIDER,
            b"kyc_attestation_user2",
            b"signature2",
            1, // Basic level
            365 * 24 * 60 * 60 // 1 year expiry
        );
        
        compliance_gate::process_kyc_attestation(
            USER3,
            KYC_PROVIDER,
            b"kyc_attestation_user3",
            b"signature3",
            3, // Institutional level
            365 * 24 * 60 * 60 // 1 year expiry
        );
        
        // Create test tokenized asset
        tokenized_asset_registry::register_tokenized_asset(
            ASSET_ISSUER,
            b"TEST_STOCK",
            b"Test Stock Corporation",
            b"TS",
            1000000, // 1M shares
            8 // 8 decimals
        );
        
        // Setup price oracle with test data
        price_oracle_adapter::set_test_price(ASSET_ISSUER, 50000); // $50.00
        
        // Setup margin requirements
        margin_engine::set_test_margin_requirements(USER1, 1000000); // $10,000
        margin_engine::set_test_margin_requirements(USER2, 500000);  // $5,000
        margin_engine::set_test_margin_requirements(USER3, 2000000); // $20,000
    }

    /// Test 1: Complete protocol initialization
    #[test]
    fun test_protocol_initialization() {
        let admin = setup_test();
        
        // Verify all modules are initialized
        assert!(avila_protocol::get_protocol_health().0, 0); // Should be healthy
        assert!(governance_admin::is_admin(ADMIN), 0);
        assert!(compliance_gate::get_whitelisted_users().length() > 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 2: Option series creation with compliance
    #[test]
    fun test_option_series_creation() {
        let admin = setup_test();
        
        // Create option series
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Verify series creation
        assert!(series_id > 0, 0);
        let (total_series, _, _, active_series, _) = avila_protocol::get_protocol_stats();
        assert!(total_series == 1, 0);
        assert!(active_series == 1, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 3: Option trading with full compliance checks
    #[test]
    fun test_option_trading_compliance() {
        let admin = setup_test();
        
        // Create option series
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Test buying options (should pass compliance)
        avila_protocol::buy_options(series_id, USER1, QUANTITY, PREMIUM);
        
        // Test writing options (should pass compliance)
        avila_protocol::write_options(series_id, USER2, QUANTITY, PREMIUM);
        
        // Verify trading activity
        let (_, daily_volume, _, daily_trades) = avila_protocol::get_daily_stats();
        assert!(daily_volume > 0, 0);
        assert!(daily_trades > 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 4: Order book functionality
    #[test]
    fun test_order_book_operations() {
        let admin = setup_test();
        
        // Create option series
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Place bid order
        let bid_order_id = avila_protocol::place_order(series_id, true, STRIKE_PRICE - 1000, QUANTITY);
        assert!(bid_order_id > 0, 0);
        
        // Place ask order
        let ask_order_id = avila_protocol::place_order(series_id, false, STRIKE_PRICE + 1000, QUANTITY);
        assert!(ask_order_id > 0, 0);
        
        // Cancel bid order
        avila_protocol::cancel_order(bid_order_id);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 5: Margin and collateral management
    #[test]
    fun test_margin_collateral_management() {
        let admin = setup_test();
        
        // Test collateral deposit
        avila_protocol::deposit_collateral(ASSET_ISSUER, 1000000);
        
        // Test margin requirements
        let (initial_req, maintenance_req) = margin_engine::compute_account_margin(USER1);
        assert!(initial_req > 0, 0);
        assert!(maintenance_req > 0, 0);
        
        // Test margin check
        margin_engine::require_sufficient_margin(USER1);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 6: Governance and compliance updates
    #[test]
    fun test_governance_compliance_updates() {
        let admin = setup_test();
        
        // Add operator role
        governance_admin::add_authorized_role(1, USER1); // Operator role
        assert!(governance_admin::is_operator(USER1), 0);
        
        // Update protocol parameter
        governance_admin::update_parameter(b"0", 2000u128); // Update min strike price
        
        // Add compliance rule for series
        compliance_gate::add_compliance_rule(
            1, // series_id
            2, // min_kyc_level (accredited)
            100, // max_risk_score
            true, // requires_accreditation
            1000000, // max_position_size
            0, // trading_hours_start (always open)
            9999999999 // trading_hours_end (always open)
        );
        
        // Verify compliance rule
        let rule = compliance_gate::get_compliance_rules(1);
        assert!(option::is_some(&rule), 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 7: Event emission and auditing
    #[test]
    fun test_event_emission_auditing() {
        let admin = setup_test();
        
        // Create option series (should emit events)
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Verify event counters
        let series_events = events_and_auditing::get_event_counter(0); // SERIES events
        assert!(series_events > 0, 0);
        
        // Verify audit logs
        let total_logs = events_and_auditing::get_total_audit_logs();
        assert!(total_logs > 0, 0);
        
        // Get user audit logs
        let user_logs = events_and_auditing::get_user_audit_logs(ASSET_ISSUER);
        assert!(user_logs.length() > 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 8: Risk management and liquidation
    #[test]
    fun test_risk_management_liquidation() {
        let admin = setup_test();
        
        // Create option series
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Test margin check
        margin_engine::require_sufficient_margin(USER1);
        
        // Test liquidation check
        avila_protocol::check_liquidation(USER1);
        
        // Emit risk event
        events_and_auditing::emit_risk_event(
            0, // margin_call
            USER1,
            series_id,
            b"test_risk_event"
        );
        
        // Verify risk events
        let risk_events = events_and_auditing::get_event_counter(3); // RISK events
        assert!(risk_events > 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 9: Settlement engine functionality
    #[test]
    fun test_settlement_engine() {
        let admin = setup_test();
        
        // Create option series
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Test settlement preparation
        settlement_engine::prepare_settlement(series_id);
        
        // Test cash settlement
        settlement_engine::settle_cash(series_id);
        
        // Emit settlement event
        events_and_auditing::emit_settlement(series_id, 0, 0, 0);
        
        // Verify settlement events
        let settlement_events = events_and_auditing::get_event_counter(2); // SETTLEMENT events
        assert!(settlement_events > 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 10: Complete end-to-end workflow
    #[test]
    fun test_complete_workflow() {
        let admin = setup_test();
        
        // 1. Create option series
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // 2. Setup collateral
        avila_protocol::deposit_collateral(ASSET_ISSUER, 1000000);
        
        // 3. Trade options
        avila_protocol::buy_options(series_id, USER1, QUANTITY, PREMIUM);
        avila_protocol::write_options(series_id, USER2, QUANTITY, PREMIUM);
        
        // 4. Place orders
        let bid_order = avila_protocol::place_order(series_id, true, STRIKE_PRICE - 500, QUANTITY);
        let ask_order = avila_protocol::place_order(series_id, false, STRIKE_PRICE + 500, QUANTITY);
        
        // 5. Match orders
        avila_protocol::match_orders(bid_order);
        
        // 6. Exercise options
        avila_protocol::exercise_options(series_id, USER1, QUANTITY);
        
        // 7. Settle expired series
        avila_protocol::settle_expired_series(series_id);
        
        // 8. Verify final state
        let (total_series, total_volume, _, active_series, _) = avila_protocol::get_protocol_stats();
        assert!(total_series == 1, 0);
        assert!(total_volume > 0, 0);
        assert!(active_series == 0, 0); // Should be settled
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 11: Emergency pause and resume
    #[test]
    fun test_emergency_pause_resume() {
        let admin = setup_test();
        
        // Emergency pause
        avila_protocol::emergency_pause();
        
        // Verify modules are paused
        let paused_modules = governance_admin::get_paused_modules();
        assert!(paused_modules.length() > 0, 0);
        
        // Resume operations
        avila_protocol::resume_operations();
        
        // Verify modules are unpaused
        let paused_modules_after = governance_admin::get_paused_modules();
        assert!(paused_modules_after.length() == 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 12: Compliance rule enforcement
    #[test]
    fun test_compliance_rule_enforcement() {
        let admin = setup_test();
        
        // Create restricted series with compliance rules
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Add compliance rule requiring accreditation
        compliance_gate::add_compliance_rule(
            series_id,
            2, // min_kyc_level (accredited)
            50, // max_risk_score
            true, // requires_accreditation
            500000, // max_position_size
            0, // trading_hours_start
            9999999999 // trading_hours_end
        );
        
        // Verify series is restricted
        assert!(compliance_gate::is_series_restricted(series_id), 0);
        
        // Test compliance check
        assert!(compliance_gate::is_user_allowed_for_series(USER1, series_id), 0); // Accredited user
        assert!(!compliance_gate::is_user_allowed_for_series(USER2, series_id), 0); // Basic user
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 13: Price oracle integration
    #[test]
    fun test_price_oracle_integration() {
        let admin = setup_test();
        
        // Get spot price
        let (spot_price, timestamp) = price_oracle_adapter::get_spot_price(ASSET_ISSUER);
        assert!(spot_price > 0, 0);
        assert!(timestamp > 0, 0);
        
        // Check price freshness
        let is_fresh = price_oracle_adapter::is_price_fresh(ASSET_ISSUER);
        assert!(is_fresh, 0);
        
        // Get settlement price
        let settlement_price = price_oracle_adapter::get_settlement_price(
            ASSET_ISSUER,
            timestamp::now_seconds(),
            timestamp::now_seconds() + 86400
        );
        assert!(settlement_price > 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 14: Tokenized asset registry
    #[test]
    fun test_tokenized_asset_registry() {
        let admin = setup_test();
        
        // Get asset info
        let asset_info = tokenized_asset_registry::get_tokenized_asset(ASSET_ISSUER);
        assert!(option::is_some(&asset_info), 0);
        
        // Verify asset details
        let asset = option::borrow(&asset_info, 0);
        assert!(asset.symbol == b"TS", 0);
        assert!(asset.total_supply == 1000000, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test 15: Protocol statistics and monitoring
    #[test]
    fun test_protocol_statistics_monitoring() {
        let admin = setup_test();
        
        // Get initial stats
        let (initial_series, initial_volume, _, initial_active, _) = avila_protocol::get_protocol_stats();
        assert!(initial_series == 0, 0);
        assert!(initial_volume == 0, 0);
        
        // Create series and trade
        let series_id = avila_protocol::create_option_series(
            ASSET_ISSUER,
            STRIKE_PRICE,
            timestamp::now_seconds() + (EXPIRY_DAYS * 24 * 60 * 60),
            0, // CALL option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        avila_protocol::buy_options(series_id, USER1, QUANTITY, PREMIUM);
        
        // Get updated stats
        let (updated_series, updated_volume, _, updated_active, _) = avila_protocol::get_protocol_stats();
        assert!(updated_series == 1, 0);
        assert!(updated_volume > 0, 0);
        assert!(updated_active == 1, 0);
        
        // Get daily stats
        let (daily_volume, daily_trades, _, _) = avila_protocol::get_daily_stats();
        assert!(daily_volume > 0, 0);
        assert!(daily_trades > 0, 0);
        
        // Reset daily stats
        avila_protocol::reset_daily_stats();
        let (reset_volume, reset_trades, _, _) = avila_protocol::get_daily_stats();
        assert!(reset_volume == 0, 0);
        assert!(reset_trades == 0, 0);
        
        // Cleanup
        account::destroy_signer(admin);
    }

    /// Test American-style options early exercise
    #[test]
    fun test_american_style_early_exercise() {
        let admin = setup_test();
        let user1 = account::create_account_for_test(USER1);
        let user2 = account::create_account_for_test(USER2);
        
        // Create American-style option series
        let series_id = options_core::create_series_for_test(
            &admin,
            ASSET_ISSUER,
            STRIKE_PRICE,
            EXPIRY_DAYS,
            0, // Call option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Buy options
        let long_position = options_core::buy_option(&user1, series_id, QUANTITY, PREMIUM);
        
        // Write options
        let short_position = options_core::write_option(&user2, series_id, QUANTITY);
        
        // Simulate early exercise (American-style allows this)
        let current_market_price = 60000; // $60.00 - above strike price
        
        // Exercise options early (American-style)
        let payout = options_core::exercise(&user1, series_id, QUANTITY);
        
        // Verify early exercise was successful
        assert!(payout > 0, 1);
        
        // Test American-style early exercise through main protocol
        avila_protocol::exercise_american_early(series_id, USER1, QUANTITY, current_market_price);
        
        // Clean up
        options_core::drop(long_position);
        options_core::drop(short_position);
    }

    /// Test American-style options margin requirements
    #[test]
    fun test_american_style_margin_requirements() {
        let admin = setup_test();
        let user1 = account::create_account_for_test(USER1);
        
        // Create American-style option series
        let series_id = options_core::create_series_for_test(
            &admin,
            ASSET_ISSUER,
            STRIKE_PRICE,
            EXPIRY_DAYS,
            0, // Call option
            CONTRACT_SIZE,
            0, // Cash settled
            ASSET_ISSUER
        );
        
        // Calculate American-style margin requirements
        let entry_price = 50000; // $50.00
        let time_to_expiry = EXPIRY_DAYS * 24 * 60 * 60; // Convert to seconds
        
        let american_margin = margin_engine::calculate_american_option_margin(
            series_id,
            0, // Long position
            QUANTITY as i128,
            entry_price,
            time_to_expiry
        );
        
        // Verify American-style margin is higher than standard margin
        let standard_margin = margin_engine::calculate_position_margin(
            series_id,
            0, // Long position
            QUANTITY as i128,
            entry_price
        );
        
        assert!(american_margin > standard_margin, 2);
        
        // Clean up
    }
} 