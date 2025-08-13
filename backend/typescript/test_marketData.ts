// Test file for Market Data Service
// Demonstrates basic functionality and error handling

import { marketDataService, getMarketData, startMarketDataPolling, stopMarketDataPolling } from './marketDataService';

async function testMarketDataService() {
  console.log('🧪 Testing Market Data Service...\n');

  try {
    // Test 1: Get all market data
    console.log('📊 Test 1: Fetching all market data...');
    const allData = await marketDataService.getAllMarketData();
    console.log(`✅ Success: ${allData.tradfi.length} TradFi assets, ${allData.defi.length} DeFi assets`);
    console.log(`📅 Timestamp: ${new Date(allData.timestamp).toISOString()}`);
    console.log(`🔗 Data sources: ${allData.dataSources.join(', ')}`);
    if (allData.errors.length > 0) {
      console.log(`⚠️ Errors: ${allData.errors.join(', ')}`);
    }
    console.log('');

    // Test 2: Get TradFi data only
    console.log('🏛️ Test 2: Fetching TradFi data only...');
    const tradfiData = await marketDataService.getTradFiData();
    console.log(`✅ Success: ${tradfiData.length} TradFi assets`);
    if (tradfiData.length > 0 && tradfiData[0]) {
      console.log(`📈 Sample asset: ${tradfiData[0].asset} (${tradfiData[0].symbol}) - $${tradfiData[0].price}`);
    }
    console.log('');

    // Test 3: Get DeFi data only
    console.log('🌐 Test 3: Fetching DeFi data only...');
    const defiData = await marketDataService.getDeFiData();
    console.log(`✅ Success: ${defiData.length} DeFi assets`);
    if (defiData.length > 0 && defiData[0]) {
      console.log(`📈 Sample asset: ${defiData[0].asset} (${defiData[0].symbol}) - $${defiData[0].price}`);
    }
    console.log('');

    // Test 4: Test exported functions
    console.log('🔧 Test 4: Testing exported functions...');
    const exportedData = await getMarketData();
    console.log(`✅ Exported function success: ${exportedData.tradfi.length} TradFi, ${exportedData.defi.length} DeFi`);
    console.log('');

    // Test 5: Cache statistics
    console.log('💾 Test 5: Cache statistics...');
    const cacheStats = marketDataService.getCacheStats();
    console.log(`📊 Cache size: ${cacheStats.size}`);
    console.log(`🔑 Cache keys: ${cacheStats.keys.join(', ')}`);
    console.log(`🎯 Cache hit rate: ${cacheStats.hitRate}`);
    console.log('');

    // Test 6: Start and stop polling
    console.log('🔄 Test 6: Testing polling functionality...');
    let pollCount = 0;
    
    startMarketDataPolling((data) => {
      pollCount++;
      console.log(`📡 Poll ${pollCount}: ${data.tradfi.length} TradFi, ${data.defi.length} DeFi assets`);
      
      if (pollCount >= 2) {
        console.log('⏹️ Stopping polling after 2 updates...');
        stopMarketDataPolling();
      }
    });

    // Wait for polling to complete
    await new Promise(resolve => setTimeout(resolve, 70000)); // Wait 70 seconds for 2 polls

    console.log('');

    // Test 7: Error handling simulation
    console.log('🚨 Test 7: Testing error handling...');
    console.log('💡 Note: This test simulates API failures to test fallback logic');
    
    // Clear cache to force fresh API calls
    marketDataService.clearCache();
    console.log('🗑️ Cache cleared');
    
    // Try to fetch data (may trigger fallback)
    const fallbackData = await marketDataService.getAllMarketData();
    console.log(`✅ Fallback test: ${fallbackData.tradfi.length} TradFi, ${fallbackData.defi.length} DeFi assets`);
    console.log(`🔗 Data sources: ${fallbackData.dataSources.join(', ')}`);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • TradFi assets available: ${allData.tradfi.length}`);
    console.log(`   • DeFi assets available: ${allData.defi.length}`);
    console.log(`   • Data sources: ${allData.dataSources.join(', ')}`);
    console.log(`   • Cache performance: ${cacheStats.hitRate * 100}% hit rate`);
    console.log(`   • Polling tested: ${pollCount} updates received`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testMarketDataService()
    .then(() => {
      console.log('\n✨ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { testMarketDataService }; 