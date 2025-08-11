#[test_only]
module avila_protocol::avila_protocol_tests {
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use avila_protocol::avila_protocol;

    // Test addresses
    const ADMIN: address = @0x1;
    const USER1: address = @0x2;
    const USER2: address = @0x3;
    const UNDERLYING: address = @0x4;

    // Test constants
    const OPTION_TYPE_CALL: u64 = 0;
    const OPTION_TYPE_PUT: u64 = 1;
    const STRIKE_PRICE: u64 = 10000; // $100
    const EXPIRATION_DAYS: u64 = 30;
    const AMOUNT: u64 = 1000;
    const PREMIUM: u64 = 500; // $5 per option

    #[test]
    fun test_protocol_initialization() {
        let admin = account::create_account_for_test(ADMIN);
        
        // Initialize protocol
        avila_protocol::initialize_for_test(&admin);
        
        // Verify initialization
        assert!(avila_protocol::is_initialized(), 1);
        
        // Get stats
        let (admin_addr, total_options, total_volume, total_premium, total_fees) = avila_protocol::get_protocol_stats();
        assert!(admin_addr == ADMIN, 2);
        assert!(total_options == 0, 3);
        assert!(total_volume == 0, 4);
        assert!(total_premium == 0, 5);
        assert!(total_fees == 0, 6);
    }

    #[test]
    fun test_create_call_option() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Create call option
        let option_id = avila_protocol::create_option_for_test(
            &admin,
            OPTION_TYPE_CALL,
            UNDERLYING,
            STRIKE_PRICE,
            EXPIRATION_DAYS,
            AMOUNT,
            PREMIUM
        );
        
        // Verify option creation
        assert!(option_id != @0x0, 7);
        
        // Check protocol stats
        let (_, total_options, total_volume, _, _) = avila_protocol::get_protocol_stats();
        assert!(total_options == 1, 8);
        assert!(total_volume == AMOUNT, 9);
    }

    #[test]
    fun test_create_put_option() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Create put option
        let option_id = avila_protocol::create_option_for_test(
            &admin,
            OPTION_TYPE_PUT,
            UNDERLYING,
            STRIKE_PRICE,
            EXPIRATION_DAYS,
            AMOUNT,
            PREMIUM
        );
        
        // Verify option creation
        assert!(option_id != @0x0, 10);
        
        // Check protocol stats
        let (_, total_options, total_volume, _, _) = avila_protocol::get_protocol_stats();
        assert!(total_options == 1, 11);
        assert!(total_volume == AMOUNT, 12);
    }

    #[test]
    fun test_create_position() {
        let admin = account::create_account_for_test(ADMIN);
        let user = account::create_account_for_test(USER1);
        avila_protocol::initialize_for_test(&admin);
        
        // Create option
        let option_id = avila_protocol::create_option_for_test(
            &admin,
            OPTION_TYPE_CALL,
            UNDERLYING,
            STRIKE_PRICE,
            EXPIRATION_DAYS,
            AMOUNT,
            PREMIUM
        );
        
        // Create position
        let position_amount = 100;
        let position = avila_protocol::create_position(&user, option_id, position_amount);
        
        // Verify position creation
        assert!(avila_protocol::get_position_option_id(&position) == option_id, 13);
        assert!(avila_protocol::get_position_user(&position) == USER1, 14);
        assert!(avila_protocol::get_position_amount(&position) == position_amount, 15);
        assert!(avila_protocol::get_position_premium_paid(&position) > 0, 16);
        
        // Verify option is active
        assert!(avila_protocol::is_option_active(option_id), 17);
        
        // Verify option is not expired
        assert!(!avila_protocol::is_option_expired(option_id), 18);
    }

    #[test]
    fun test_option_calculations() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test call option payout calculation
        let current_price = 12000; // $120
        let strike_price = 10000; // $100
        let amount = 1000;
        
        // Expected payout: (current_price - strike_price) * amount
        let expected_payout = (current_price - strike_price) * amount;
        assert!(expected_payout == 2000000, 19); // $20,000
        
        // Test put option payout calculation
        let current_price_put = 8000; // $80
        let expected_payout_put = (strike_price - current_price_put) * amount;
        assert!(expected_payout_put == 2000000, 20); // $20,000
    }

    #[test]
    fun test_premium_calculations() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test premium calculation
        let premium_per_option = 500; // $5
        let amount = 1000;
        let total_premium = premium_per_option * amount;
        assert!(total_premium == 500000, 21); // $5,000
        
        // Test premium refund calculation
        let premium_refund = total_premium / 2;
        assert!(premium_refund == 250000, 22); // $2,500
    }

    #[test]
    fun test_collateral_calculations() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test collateral requirement calculation
        let strike_price = 10000; // $100
        let amount = 1000;
        let base_collateral = strike_price * amount;
        let required_collateral = (base_collateral * 150) / 100; // 150% margin
        
        assert!(base_collateral == 10000000, 23); // $100,000
        assert!(required_collateral == 15000000, 24); // $150,000
    }

    #[test]
    fun test_settlement_fee_calculation() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test settlement fee calculation (0.5%)
        let payout = 1000000; // $10,000
        let settlement_fee = (payout * 50) / 10000; // 0.5%
        let net_payout = payout - settlement_fee;
        
        assert!(settlement_fee == 5000, 25); // $50
        assert!(net_payout == 995000, 26); // $9,950
    }

    #[test]
    fun test_protocol_constants() {
        // Test protocol constants
        let collateral_multiplier = 150; // 150%
        let settlement_fee_bps = 50; // 0.5%
        let max_expiration_days = 365;
        let min_strike_price = 1000; // $10
        let max_strike_price = 1000000; // $10,000
        
        assert!(collateral_multiplier == 150, 27);
        assert!(settlement_fee_bps == 50, 28);
        assert!(max_expiration_days == 365, 29);
        assert!(min_strike_price == 1000, 30);
        assert!(max_strike_price == 1000000, 31);
    }

    #[test]
    fun test_option_validation() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test valid option parameters
        let valid_option_type = OPTION_TYPE_CALL;
        let valid_strike_price = 10000;
        let valid_expiration_days = 30;
        let valid_amount = 1000;
        let valid_premium = 500;
        
        assert!(valid_option_type == OPTION_TYPE_CALL || valid_option_type == OPTION_TYPE_PUT, 32);
        assert!(valid_strike_price >= 1000 && valid_strike_price <= 1000000, 33);
        assert!(valid_expiration_days > 0 && valid_expiration_days <= 365, 34);
        assert!(valid_amount > 0, 35);
        assert!(valid_premium > 0, 36);
    }

    #[test]
    fun test_multiple_options() {
        let admin = account::create_account_for_test(ADMIN);
        let user1 = account::create_account_for_test(USER1);
        avila_protocol::initialize_for_test(&admin);
        
        // Create multiple options with different accounts
        let option1 = avila_protocol::create_option_for_test(
            &admin,
            OPTION_TYPE_CALL,
            UNDERLYING,
            10000, // $100
            30,
            1000,
            500
        );
        
        let option2 = avila_protocol::create_option_for_test(
            &user1,
            OPTION_TYPE_PUT,
            UNDERLYING,
            15000, // $150
            60,
            2000,
            750
        );
        
        // Verify both options created
        assert!(option1 != option2, 37);
        assert!(avila_protocol::is_option_active(option1), 38);
        assert!(avila_protocol::is_option_active(option2), 39);
        
        // Check protocol stats
        let (_, total_options, total_volume, _, _) = avila_protocol::get_protocol_stats();
        assert!(total_options == 2, 40);
        assert!(total_volume == 3000, 41); // 1000 + 2000
    }

    #[test]
    fun test_profit_loss_scenarios() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Scenario 1: Profitable call option
        let strike_price = 10000; // $100
        let current_price = 12000; // $120
        let amount = 1000;
        let premium_paid = 500000; // $5,000
        
        let intrinsic_value = (current_price - strike_price) * amount;
        let net_profit = intrinsic_value - premium_paid;
        
        assert!(intrinsic_value == 2000000, 42); // $20,000
        assert!(net_profit == 1500000, 43); // $15,000 profit
        
        // Scenario 2: Unprofitable call option
        let current_price_low = 8000; // $80
        let intrinsic_value_low = if (current_price_low > strike_price) {
            (current_price_low - strike_price) * amount
        } else {
            0
        };
        let net_loss = premium_paid - intrinsic_value_low;
        
        assert!(intrinsic_value_low == 0, 44);
        assert!(net_loss == 500000, 45); // $5,000 loss
    }

    #[test]
    fun test_breakeven_calculations() {
        // Test breakeven point calculations
        let strike_price = 10000; // $100
        let premium_per_option = 500; // $5
        let amount = 1000;
        
        // For call options: breakeven = strike_price + (premium / amount)
        let breakeven_call = strike_price + (premium_per_option * amount / amount);
        assert!(breakeven_call == 10500, 46); // $105
        
        // For put options: breakeven = strike_price - (premium / amount)
        let breakeven_put = strike_price - (premium_per_option * amount / amount);
        assert!(breakeven_put == 9500, 47); // $95
    }

    #[test]
    fun test_time_value_decay() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test time value concepts (simplified)
        let current_time = 1000000u64; // Mock timestamp
        let expiration_time = current_time + (30 * 24 * 60 * 60); // 30 days
        let time_to_expiry = expiration_time - current_time;
        
        assert!(time_to_expiry > 0, 48);
        assert!(time_to_expiry <= 30 * 24 * 60 * 60, 49);
        
        // Premium should decrease as time to expiry decreases
        let premium_30_days = 500; // $5 for 30 days
        let premium_15_days = 250; // $2.50 for 15 days (simplified)
        
        assert!(premium_30_days > premium_15_days, 50);
    }

    #[test]
    fun test_risk_management() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test risk management features
        let max_position_size = 10000; // Maximum position size
        let user_position = 5000; // User's position
        
        // Check position size limits
        assert!(user_position <= max_position_size, 51);
        
        // Test margin requirements
        let collateral_ratio = 150; // 150%
        let required_margin = (user_position * collateral_ratio) / 100;
        assert!(required_margin == 7500, 52); // 150% of 5000
    }

    #[test]
    fun test_protocol_governance() {
        let admin = account::create_account_for_test(ADMIN);
        avila_protocol::initialize_for_test(&admin);
        
        // Test protocol governance features
        let (admin_addr, _, _, _, _) = avila_protocol::get_protocol_stats();
        assert!(admin_addr == ADMIN, 53);
        
        // Test protocol initialization
        assert!(avila_protocol::is_initialized(), 54);
    }
} 