module avila_protocol::multi_stock_mock {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::account;
    use aptos_framework::timestamp;

    // ===== CONSTANTS =====
    const ADMIN_ROLE: u8 = 0;
    const OPERATOR_ROLE: u8 = 1;
    
    // ===== ERRORS =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_PERMISSIONS: u64 = 3;
    const E_STOCK_NOT_REGISTERED: u64 = 4;
    const E_STOCK_ALREADY_REGISTERED: u64 = 5;
    const E_INSUFFICIENT_BALANCE: u64 = 6;
    const E_INVALID_TICKER: u64 = 7;
    const E_INVALID_DECIMALS: u64 = 8;
    const E_INVALID_AMOUNT: u64 = 9;
    const E_INVALID_PRICE: u64 = 10;

    // ===== STRUCTS =====
    
    /// Admin capabilities for the module
    struct AdminCap has key {
        admin: address,
    }

    /// Operator capabilities for the module
    struct OperatorCap has key {
        operator: address,
    }

    /// Stock information
    struct Stock has store, drop, copy {
        ticker: String,
        name: String,
        decimals: u8,
        total_supply: u64,
        is_active: bool,
        created_at: u64,
    }

    /// User balance for a specific stock
    struct UserBalance has store, drop, copy {
        ticker: String,
        balance: u64,
        last_updated: u64,
    }

    /// Price oracle data for a stock
    struct PriceData has store, drop, copy {
        ticker: String,
        price: u64, // Price in smallest units (e.g., cents for USD)
        price_decimals: u8,
        last_updated: u64,
        price_history: vector<PricePoint>,
    }

    /// Historical price point
    struct PricePoint has store, drop, copy {
        timestamp: u64,
        price: u64,
    }

    /// Module state
    struct MultiStockMock has key {
        admin: address,
        operator: address,
        stocks: vector<Stock>,
        ticker_to_index: std::table::Table<String, u64>,
        user_balances: std::table::Table<address, vector<UserBalance>>,
        price_data: std::table::Table<String, PriceData>,
        total_stocks: u64,
        total_users: u64,
        mock_timestamp: u64,
    }

    // ===== EVENTS =====
    
    struct StockRegisteredEvent has drop, store {
        ticker: String,
        name: String,
        decimals: u8,
        admin: address,
        timestamp: u64,
    }

    struct StockMintedEvent has drop, store {
        ticker: String,
        recipient: address,
        amount: u64,
        admin: address,
        timestamp: u64,
    }

    struct StockTransferredEvent has drop, store {
        ticker: String,
        from: address,
        to: address,
        amount: u64,
        timestamp: u64,
    }

    struct PriceUpdatedEvent has drop, store {
        ticker: String,
        old_price: u64,
        new_price: u64,
        operator: address,
        timestamp: u64,
    }

    // ===== INITIALIZATION =====
    
    /// Initialize the MultiStockMock module
    public entry fun init(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Check if already initialized
        assert!(!exists<MultiStockMock>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        // Create admin capability
        move_to(admin, AdminCap { admin: admin_addr });
        
        // Create operator capability (initially same as admin)
        move_to(admin, OperatorCap { operator: admin_addr });
        
        // Initialize module state
        move_to(admin, MultiStockMock {
            admin: admin_addr,
            operator: admin_addr,
            stocks: vector::empty(),
            ticker_to_index: std::table::new(),
            user_balances: std::table::new(),
            price_data: std::table::new(),
            total_stocks: 0,
            total_users: 0,
            mock_timestamp: 0,
        });
    }

    // ===== ADMIN FUNCTIONS =====
    
    /// Register a new stock
    #[test_only]
    public fun set_mock_timestamp(timestamp: u64) acquires MultiStockMock {
        let module_state = borrow_global_mut<MultiStockMock>(@avila_protocol);
        module_state.mock_timestamp = timestamp;
    }

    #[test_only]
    public fun get_mock_timestamp(): u64 acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        module_state.mock_timestamp
    }

    public fun register_stock(
        admin: &signer,
        ticker: String,
        name: String,
        decimals: u8
    ) acquires MultiStockMock {
        // Verify admin
        let admin_addr = signer::address_of(admin);
        let module_state = borrow_global_mut<MultiStockMock>(@avila_protocol);
        assert!(module_state.admin == admin_addr, 1);
        
        // Check if stock already exists
        assert!(!std::table::contains(&module_state.ticker_to_index, ticker), 2);
        
        // Use mock timestamp in tests, real timestamp in production
        let current_time = if (module_state.mock_timestamp > 0) {
            module_state.mock_timestamp
        } else {
            timestamp::now_seconds()
        };
        
        let stock = Stock {
            ticker,
            name,
            decimals,
            total_supply: 0,
            is_active: true,
            created_at: current_time
        };
        
        // Add to stocks vector
        vector::push_back(&mut module_state.stocks, stock);
        let stock_index = module_state.total_stocks;
        
        // Add to ticker mapping
        std::table::add(&mut module_state.ticker_to_index, ticker, stock_index);
        
        // Update counters
        module_state.total_stocks = module_state.total_stocks + 1;
    }

    /// Mint tokens for a registered stock
    public entry fun mint(
        admin: &signer,
        ticker: String,
        recipient: address,
        amount: u64,
    ) acquires MultiStockMock {
        let admin_addr = signer::address_of(admin);
        assert!(exists<AdminCap>(admin_addr), E_INSUFFICIENT_PERMISSIONS);
        
        // Validate inputs
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(string::length(&ticker) > 0, E_INVALID_TICKER);
        
        let module_state = borrow_global_mut<MultiStockMock>(@avila_protocol);
        
        // Check if stock exists
        assert!(std::table::contains(&module_state.ticker_to_index, ticker), E_STOCK_NOT_REGISTERED);
        
        let stock_index = *std::table::borrow(&module_state.ticker_to_index, ticker);
        let stock = vector::borrow_mut(&mut module_state.stocks, stock_index);
        assert!(stock.is_active, E_STOCK_NOT_REGISTERED);
        
        // Update total supply
        stock.total_supply = stock.total_supply + amount;
        
        // Update user balance
        update_user_balance(module_state, ticker, recipient, amount, true);
        
                        // Event emission removed due to friend module restrictions
    }

    /// Set operator address
    public entry fun set_operator(
        admin: &signer,
        new_operator: address,
    ) acquires MultiStockMock {
        let admin_addr = signer::address_of(admin);
        assert!(exists<AdminCap>(admin_addr), E_INSUFFICIENT_PERMISSIONS);
        
        let module_state = borrow_global_mut<MultiStockMock>(@avila_protocol);
        assert!(module_state.admin == admin_addr, E_INSUFFICIENT_PERMISSIONS);
        
        module_state.operator = new_operator;
    }

    // ===== OPERATOR FUNCTIONS =====
    
    /// Update price for a stock (operator only)
    public entry fun set_price(
        operator: &signer,
        ticker: String,
        price: u64,
        price_decimals: u8,
    ) acquires MultiStockMock {
        let operator_addr = signer::address_of(operator);
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        assert!(module_state.operator == operator_addr, E_INSUFFICIENT_PERMISSIONS);
        
        // Validate inputs
        assert!(price > 0, E_INVALID_PRICE);
        assert!(price_decimals <= 18, E_INVALID_DECIMALS);
        assert!(string::length(&ticker) > 0, E_INVALID_TICKER);
        
        let module_state = borrow_global_mut<MultiStockMock>(@avila_protocol);
        
        // Check if stock exists
        assert!(std::table::contains(&module_state.ticker_to_index, ticker), E_STOCK_NOT_REGISTERED);
        
        // Get or create price data
        let price_data = if (std::table::contains(&module_state.price_data, ticker)) {
            std::table::borrow_mut(&mut module_state.price_data, ticker)
        } else {
            let new_price_data = PriceData {
                ticker,
                price: 0,
                price_decimals: 0,
                last_updated: 0,
                price_history: vector::empty(),
            };
            std::table::add(&mut module_state.price_data, ticker, new_price_data);
            std::table::borrow_mut(&mut module_state.price_data, ticker)
        };
        
        let _old_price = price_data.price;
        price_data.price = price;
        price_data.price_decimals = price_decimals;
        
        // Use mock timestamp in tests, real timestamp in production
        let current_time = if (module_state.mock_timestamp > 0) {
            module_state.mock_timestamp
        } else {
            timestamp::now_seconds()
        };
        price_data.last_updated = current_time;
        
        // Add to price history
        let price_point = PricePoint {
            timestamp: current_time,
            price,
        };
        vector::push_back(&mut price_data.price_history, price_point);
        
                        // Event emission removed due to friend module restrictions
    }

    // ===== PUBLIC FUNCTIONS =====
    
    /// Transfer tokens between addresses
    public entry fun transfer(
        from: &signer,
        ticker: String,
        to: address,
        amount: u64,
    ) acquires MultiStockMock {
        let from_addr = signer::address_of(from);
        
        // Validate inputs
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(string::length(&ticker) > 0, E_INVALID_TICKER);
        assert!(from_addr != to, E_INVALID_AMOUNT);
        
        let module_state = borrow_global_mut<MultiStockMock>(@avila_protocol);
        
        // Check if stock exists
        assert!(std::table::contains(&module_state.ticker_to_index, ticker), E_STOCK_NOT_REGISTERED);
        
        // Update balances
        update_user_balance(module_state, ticker, from_addr, amount, false);
        update_user_balance(module_state, ticker, to, amount, true);
        
                        // Event emission removed due to friend module restrictions
    }

    // ===== VIEW FUNCTIONS =====
    
    /// Get current price for a stock
    public fun get_price(ticker: String): (u64, u8, u64) acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        
        if (std::table::contains(&module_state.price_data, ticker)) {
            let price_data = std::table::borrow(&module_state.price_data, ticker);
            (price_data.price, price_data.price_decimals, price_data.last_updated)
        } else {
            (0, 0, 0)
        }
    }

    /// Get user balance for a specific stock
    public fun balance_of(user: address, ticker: String): u64 acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        
        if (std::table::contains(&module_state.user_balances, user)) {
            let balances = std::table::borrow(&module_state.user_balances, user);
            let i = 0;
            let len = vector::length(balances);
            
            while (i < len) {
                let balance = vector::borrow(balances, i);
                if (balance.ticker == ticker) {
                    return balance.balance
                };
                i = i + 1;
            };
        };
        
        0
    }

    /// Get stock information
    public fun get_stock_info(ticker: String): (String, String, u8, u64, bool, u64) acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        
        if (std::table::contains(&module_state.ticker_to_index, ticker)) {
            let stock_index = *std::table::borrow(&module_state.ticker_to_index, ticker);
            let stock = vector::borrow(&module_state.stocks, stock_index);
            (stock.ticker, stock.name, stock.decimals, stock.total_supply, stock.is_active, stock.created_at)
        } else {
            (string::utf8(b""), string::utf8(b""), 0, 0, false, 0)
        }
    }

    /// Get all registered stock tickers
    public fun get_all_tickers(): vector<String> acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        let tickers = vector::empty<String>();
        let i = 0;
        let len = vector::length(&module_state.stocks);
        
        while (i < len) {
            let stock = vector::borrow(&module_state.stocks, i);
            vector::push_back(&mut tickers, stock.ticker);
            i = i + 1;
        };
        
        tickers
    }

    /// Get total number of stocks
    public fun get_total_stocks(): u64 acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        module_state.total_stocks
    }

    // ===== HELPER FUNCTIONS =====
    
    /// Update user balance for a specific stock
    fun update_user_balance(
        module_state: &mut MultiStockMock,
        ticker: String,
        user: address,
        amount: u64,
        is_credit: bool,
    ) {
        let balances = if (std::table::contains(&module_state.user_balances, user)) {
            std::table::borrow_mut(&mut module_state.user_balances, user)
        } else {
            let new_balances = vector::empty<UserBalance>();
            std::table::add(&mut module_state.user_balances, user, new_balances);
            module_state.total_users = module_state.total_users + 1;
            std::table::borrow_mut(&mut module_state.user_balances, user)
        };
        
        let i = 0;
        let len = vector::length(balances);
        let found = false;
        
        // Find existing balance for this ticker
        while (i < len) {
            let balance = vector::borrow_mut(balances, i);
            if (balance.ticker == ticker) {
                if (is_credit) {
                    balance.balance = balance.balance + amount;
                } else {
                    assert!(balance.balance >= amount, E_INSUFFICIENT_BALANCE);
                    balance.balance = balance.balance - amount;
                };
                // Use mock timestamp in tests, real timestamp in production
                let current_time = if (module_state.mock_timestamp > 0) {
                    module_state.mock_timestamp
                } else {
                    timestamp::now_seconds()
                };
                balance.last_updated = current_time;
                found = true;
                break
            };
            i = i + 1;
        };
        
        // Create new balance if not found
        if (!found) {
            // Use mock timestamp in tests, real timestamp in production
            let current_time = if (module_state.mock_timestamp > 0) {
                module_state.mock_timestamp
            } else {
                timestamp::now_seconds()
            };
            let new_balance = UserBalance {
                ticker,
                balance: if (is_credit) amount else 0,
                last_updated: current_time,
            };
            vector::push_back(balances, new_balance);
        };
    }

    // ===== TEST FUNCTIONS =====
    
    #[test_only]
    public fun create_test_admin(): signer {
        account::create_account_for_test(@avila_protocol)
    }

    #[test_only]
    public fun create_test_user(): signer {
        account::create_account_for_test(@0x123)
    }

    /// Check if module is initialized
    public fun is_initialized(): bool {
        exists<MultiStockMock>(@avila_protocol)
    }

    /// Get admin address
    public fun get_admin(): address acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        module_state.admin
    }

    /// Get operator address
    public fun get_operator(): address acquires MultiStockMock {
        let module_state = borrow_global<MultiStockMock>(@avila_protocol);
        module_state.operator
    }
} 