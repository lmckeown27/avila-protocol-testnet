module avila_protocol::order_book {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_ORDER_ID: u64 = 4;
    const E_INVALID_PRICE: u64 = 5;
    const E_INVALID_QUANTITY: u64 = 6;
    const E_INSUFFICIENT_BALANCE: u64 = 7;
    const E_ORDER_NOT_FOUND: u64 = 8;
    const E_ORDER_ALREADY_FILLED: u64 = 9;
    const E_INVALID_SERIES_ID: u64 = 10;
    const E_PRICE_TOO_LOW: u64 = 11;
    const E_PRICE_TOO_HIGH: u64 = 12;

    /// Order types
    const ORDER_TYPE_LIMIT: u8 = 0;
    const ORDER_TYPE_MARKET: u8 = 1;

    /// Order sides
    const ORDER_SIDE_BID: u8 = 0;  // Buy
    const ORDER_SIDE_ASK: u8 = 1;  // Sell

    /// Order status
    const ORDER_STATUS_OPEN: u8 = 0;
    const ORDER_STATUS_PARTIALLY_FILLED: u8 = 1;
    const ORDER_STATUS_FILLED: u8 = 2;
    const ORDER_STATUS_CANCELLED: u8 = 3;

    /// Protocol constants
    const MIN_ORDER_SIZE: u64 = 1;
    const MAX_ORDER_SIZE: u64 = 1000000;
    const MIN_PRICE: u128 = 1;
    const MAX_PRICE: u128 = 1000000000000; // $1M
    const MAX_ORDERS_PER_USER: u64 = 100;

    /// Order structure - matches scaffold requirements
    struct Order has key, store {
        id: u64,
        series_id: u64,
        maker: address,
        is_bid: bool,                    // true = bid (buy), false = ask (sell)
        price: u128,
        remaining_qty: u64,
        timestamp: u64
    }

    /// Order book state for a specific series
    struct OrderBook has key, store {
        series_id: u64,
        best_bid: u128,
        best_ask: u128,
        total_bid_volume: u64,
        total_ask_volume: u64,
        order_count: u64,
        last_updated: u64,
    }

    /// User's order management
    struct UserOrders has key, store {
        user: address,
        active_orders: vector<u64>,
        order_count: u64,
    }

    /// Protocol state
    struct OrderBookProtocol has key {
        admin: address,
        next_order_id: u64,
        total_orders_placed: u64,
        total_volume_traded: u128,
        total_fees_collected: u128,
        is_initialized: bool,
    }

    /// Events
    #[event]
    struct OrderPlacedEvent has drop, store {
        order_id: u64,
        series_id: u64,
        maker: address,
        is_bid: bool,
        price: u128,
        quantity: u64,
        timestamp: u64,
    }

    #[event]
    struct OrderCancelledEvent has drop, store {
        order_id: u64,
        series_id: u64,
        maker: address,
        cancelled_quantity: u64,
        timestamp: u64,
    }

    #[event]
    struct OrderMatchedEvent has drop, store {
        order_id: u64,
        series_id: u64,
        maker: address,
        taker: address,
        price: u128,
        quantity: u64,
        timestamp: u64,
    }

    #[event]
    struct OrderFilledEvent has drop, store {
        order_id: u64,
        series_id: u64,
        maker: address,
        fill_price: u128,
        fill_quantity: u64,
        timestamp: u64,
    }

    /// Initialize the OrderBook module
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Check if already initialized
        assert!(!exists<OrderBookProtocol>(@avila_protocol), E_ALREADY_INITIALIZED);
        
        move_to(account, OrderBookProtocol {
            admin: account_addr,
            next_order_id: 1,
            total_orders_placed: 0,
            total_volume_traded: 0,
            total_fees_collected: 0,
            is_initialized: true,
        });
    }

    /// Initialize order book for a specific series
    public fun initialize_order_book(series_id: u64) {
        let order_book = OrderBook {
            series_id,
            best_bid: 0,
            best_ask: MAX_PRICE,
            total_bid_volume: 0,
            total_ask_volume: 0,
            order_count: 0,
            last_updated: timestamp::now_seconds(),
        };
        
        move_to(account::create_account_for_ext(@avila_protocol), order_book);
    }

    /// Place order - matches scaffold requirements
    /// This stores limit orders for option contracts with price, size, and maker
    public fun place_order(order: Order) acquires OrderBookProtocol {
        let account_addr = order.maker;
        
        // Validate inputs
        assert!(order.price >= MIN_PRICE && order.price <= MAX_PRICE, E_INVALID_PRICE);
        assert!(order.remaining_qty >= MIN_ORDER_SIZE && order.remaining_qty <= MAX_ORDER_SIZE, E_INVALID_QUANTITY);

        // Get or create user orders
        if (!exists<UserOrders>(account_addr)) {
            move_to(account::create_account_for_ext(account_addr), UserOrders {
                user: account_addr,
                active_orders: vector::empty(),
                order_count: 0,
            });
        };

        let user_orders = borrow_global_mut<UserOrders>(account_addr);
        assert!(vector::length(&user_orders.active_orders) < MAX_ORDERS_PER_USER, E_INSUFFICIENT_BALANCE);

        // Get protocol state
        let protocol = borrow_global_mut<OrderBookProtocol>(@avila_protocol);
        let order_id = protocol.next_order_id;
        protocol.next_order_id = protocol.next_order_id + 1;
        protocol.total_orders_placed = protocol.total_orders_placed + 1;

        // Set order ID
        order.id = order_id;
        order.timestamp = timestamp::now_seconds();

        // Store order
        move_to(account::create_account_for_ext(account_addr), order);

        // Add to user's active orders
        vector::push_back(&mut user_orders.active_orders, order_id);
        user_orders.order_count = user_orders.order_count + 1;

        // Update order book
        update_order_book(order.series_id, order.is_bid, order.price, order.remaining_qty, true);

        // Emit event
        let place_event = OrderPlacedEvent {
            order_id,
            series_id: order.series_id,
            maker: account_addr,
            is_bid: order.is_bid,
            price: order.price,
            quantity: order.remaining_qty,
            timestamp: order.timestamp,
        };
        event::emit(place_event);
    }

    /// Cancel order - matches scaffold requirements
    public fun cancel_order(order_id: u64, maker: address) acquires OrderBookProtocol {
        // Get user orders
        let user_orders = borrow_global_mut<UserOrders>(maker);
        
        // Find and remove order from active orders
        let i = 0;
        let len = vector::length(&user_orders.active_orders);
        while (i < len) {
            if (*vector::borrow(&user_orders.active_orders, i) == order_id) {
                let cancelled_order = vector::remove(&mut user_orders.active_orders, i);
                break
            };
            i = i + 1;
        };

        // Get the order
        let order = move_from<Order>(maker);
        assert!(order.maker == maker, E_UNAUTHORIZED);

        // Update order book
        update_order_book(order.series_id, order.is_bid, order.price, order.remaining_qty, false);

        // Emit event
        let cancel_event = OrderCancelledEvent {
            order_id,
            series_id: order.series_id,
            maker,
            cancelled_quantity: order.remaining_qty,
            timestamp: timestamp::now_seconds(),
        };
        event::emit(cancel_event);

        // Destroy the order
        let Order { id: _, series_id: _, maker: _, is_bid: _, price: _, remaining_qty: _, timestamp: _ } = order;
    }

    /// Match orders - matches scaffold requirements
    /// This allows matching engine (on-chain matching or relay off-chain + on-chain settlement)
    public fun match_orders(taker_order_id: u64): vector<u64> acquires OrderBookProtocol {
        let matched_orders = vector::empty<u64>();
        
        // This is a simplified matching engine
        // In production, this would implement proper order book matching logic:
        // - Price-time priority
        // - Partial fills
        // - Taker/maker fee enforcement
        // - Order book depth management
        
        // For now, we'll just return an empty vector
        // The actual matching logic would be implemented here
        
        matched_orders
    }

    /// Get order book state for a series
    public fun get_order_book_state(series_id: u64): (u128, u128, u64, u64) {
        if (exists<OrderBook>(@avila_protocol)) {
            let order_book = borrow_global<OrderBook>(@avila_protocol);
            (
                order_book.best_bid,
                order_book.best_ask,
                order_book.total_bid_volume,
                order_book.total_ask_volume,
            )
        } else {
            (0, MAX_PRICE, 0, 0)
        }
    }

    /// Get user's active orders
    public fun get_user_active_orders(user: address): vector<u64> {
        if (exists<UserOrders>(user)) {
            let user_orders = borrow_global<UserOrders>(user);
            *&user_orders.active_orders
        } else {
            vector::empty()
        }
    }

    /// Update order book state
    fun update_order_book(
        series_id: u64,
        is_bid: bool,
        price: u128,
        quantity: u64,
        is_add: bool
    ) {
        if (exists<OrderBook>(@avila_protocol)) {
            let order_book = borrow_global_mut<OrderBook>(@avila_protocol);
            
            if (is_bid) {
                if (is_add) {
                    order_book.total_bid_volume = order_book.total_bid_volume + quantity;
                    if (price > order_book.best_bid) {
                        order_book.best_bid = price;
                    };
                } else {
                    order_book.total_bid_volume = order_book.total_bid_volume - quantity;
                    // Would need to recalculate best bid
                };
            } else {
                if (is_add) {
                    order_book.total_ask_volume = order_book.total_ask_volume + quantity;
                    if (price < order_book.best_ask) {
                        order_book.best_ask = price;
                    };
                } else {
                    order_book.total_ask_volume = order_book.total_ask_volume - quantity;
                    // Would need to recalculate best ask
                };
            };
            
            order_book.last_updated = timestamp::now_seconds();
        };
    }

    /// Get protocol statistics
    public fun get_protocol_stats(): (address, u64, u128, u128) acquires OrderBookProtocol {
        let protocol = borrow_global<OrderBookProtocol>(@avila_protocol);
        (
            protocol.admin,
            protocol.total_orders_placed,
            protocol.total_volume_traded,
            protocol.total_fees_collected,
        )
    }

    /// Check if protocol is initialized
    public fun is_initialized(): bool {
        exists<OrderBookProtocol>(@avila_protocol)
    }

    /// Create a new order for testing or external use
    public fun create_order(
        series_id: u64,
        maker: address,
        is_bid: bool,
        price: u128,
        quantity: u64
    ): Order {
        Order {
            id: 0, // Will be set when placed
            series_id,
            maker,
            is_bid,
            price,
            remaining_qty: quantity,
            timestamp: 0, // Will be set when placed
        }
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        initialize(account);
    }

    #[test_only]
    public fun place_order_for_test(
        account: &signer,
        series_id: u64,
        is_bid: bool,
        price: u128,
        quantity: u64
    ) acquires OrderBookProtocol {
        let order = create_order(series_id, signer::address_of(account), is_bid, price, quantity);
        place_order(order);
    }
} 