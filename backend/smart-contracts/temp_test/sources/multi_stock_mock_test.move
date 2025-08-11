#[test_only]
module avila_protocol::multi_stock_mock_test {
    use std::signer;
    use std::string::Self;
    use std::vector;
    use aptos_framework::account;

    use avila_protocol::multi_stock_mock;

    #[test]
    fun test_multi_stock_mock_initialization() {
        let admin = account::create_account_for_test(@avila_protocol);
        
        // Test initialization
        multi_stock_mock::init(&admin);
        
        // Verify module was initialized
        assert!(multi_stock_mock::is_initialized(), 0);
        
        // Verify admin and operator were set correctly
        let admin_addr = signer::address_of(&admin);
        assert!(multi_stock_mock::get_admin() == admin_addr, 1);
        assert!(multi_stock_mock::get_operator() == admin_addr, 2);
    }

    #[test]
    fun test_stock_registration() {
        let admin = account::create_account_for_test(@avila_protocol);
        
        multi_stock_mock::init(&admin);
        
        // Set mock timestamp
        multi_stock_mock::set_mock_timestamp(1234567890);
        
        // Register a stock
        let ticker = string::utf8(b"AAPL");
        let name = string::utf8(b"Apple Inc.");
        let decimals = 8;
        
        multi_stock_mock::register_stock(&admin, ticker, name, decimals);
        
        // Verify stock was registered
        let (reg_ticker, reg_name, reg_decimals, total_supply, is_active, created_at) = 
            multi_stock_mock::get_stock_info(ticker);
        
        assert!(reg_ticker == ticker, 3);
        assert!(reg_name == name, 4);
        assert!(reg_decimals == decimals, 5);
        assert!(total_supply == 0, 6);
        assert!(is_active == true, 7);
        assert!(created_at > 0, 8);
    }

    #[test]
    fun test_stock_minting() {
        let admin = account::create_account_for_test(@avila_protocol);
        let _user = account::create_account_for_test(@0x123);
        
        multi_stock_mock::init(&admin);
        
        // Set mock timestamp
        multi_stock_mock::set_mock_timestamp(1234567890);
        
        // Register and mint stock
        let ticker = string::utf8(b"MSFT");
        let name = string::utf8(b"Microsoft Corporation");
        let decimals = 8;
        
        multi_stock_mock::register_stock(&admin, ticker, name, decimals);
        multi_stock_mock::mint(&admin, ticker, @0x123, 1000);
        
        // Verify balance
        let balance = multi_stock_mock::balance_of(@0x123, ticker);
        assert!(balance == 1000, 9);
    }

    #[test]
    fun test_price_updates() {
        let admin = account::create_account_for_test(@avila_protocol);
        let operator = account::create_account_for_test(@0x456);
        
        multi_stock_mock::init(&admin);
        
        // Set mock timestamp
        multi_stock_mock::set_mock_timestamp(1234567890);
        
        // Set operator
        multi_stock_mock::set_operator(&admin, @0x456);
        
        // Register stock
        let ticker = string::utf8(b"GOOGL");
        let name = string::utf8(b"Alphabet Inc.");
        let decimals = 8;
        multi_stock_mock::register_stock(&admin, ticker, name, decimals);
        
        // Update price
        let price = 15000; // $150.00 in cents
        let price_decimals = 2;
        multi_stock_mock::set_price(&operator, ticker, price, price_decimals);
        
        // Verify price
        let (current_price, current_decimals, last_updated) = multi_stock_mock::get_price(ticker);
        assert!(current_price == price, 10);
        assert!(current_decimals == price_decimals, 11);
        assert!(last_updated > 0, 12);
    }

    #[test]
    fun test_stock_transfer() {
        let admin = account::create_account_for_test(@avila_protocol);
        let user1 = account::create_account_for_test(@0x111);
        let _user2 = account::create_account_for_test(@0x222);
        
        multi_stock_mock::init(&admin);
        
        // Set mock timestamp
        multi_stock_mock::set_mock_timestamp(1234567890);
        
        // Register and mint stock
        let ticker = string::utf8(b"TSLA");
        let name = string::utf8(b"Tesla Inc.");
        let decimals = 8;
        
        multi_stock_mock::register_stock(&admin, ticker, name, decimals);
        multi_stock_mock::mint(&admin, ticker, @0x111, 500);
        
        // Transfer tokens
        multi_stock_mock::transfer(&user1, ticker, @0x222, 200);
        
        // Verify balances
        let balance1 = multi_stock_mock::balance_of(@0x111, ticker);
        let balance2 = multi_stock_mock::balance_of(@0x222, ticker);
        
        assert!(balance1 == 300, 13);
        assert!(balance2 == 200, 14);
    }

    #[test]
    fun test_get_all_tickers() {
        let admin = account::create_account_for_test(@avila_protocol);
        
        multi_stock_mock::init(&admin);
        
        // Set mock timestamp
        multi_stock_mock::set_mock_timestamp(1234567890);
        
        // Register multiple stocks
        multi_stock_mock::register_stock(&admin, string::utf8(b"AAPL"), string::utf8(b"Apple"), 8);
        multi_stock_mock::register_stock(&admin, string::utf8(b"MSFT"), string::utf8(b"Microsoft"), 8);
        multi_stock_mock::register_stock(&admin, string::utf8(b"GOOGL"), string::utf8(b"Alphabet"), 8);
        
        // Get all tickers
        let tickers = multi_stock_mock::get_all_tickers();
        assert!(vector::length(&tickers) == 3, 15);
        
        // Verify total stocks count
        let total_stocks = multi_stock_mock::get_total_stocks();
        assert!(total_stocks == 3, 16);
    }
} 