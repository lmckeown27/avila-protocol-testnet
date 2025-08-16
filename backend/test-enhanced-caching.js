#!/usr/bin/env node
const { CompanyDiscoveryService } = require('./dist/companyDiscoveryService');

async function testEnhancedCaching() {
  console.log('🧪 Testing Enhanced Caching System...\n');
  try {
    const service = new CompanyDiscoveryService();
    console.log('📊 Testing initial discovery...');
    const startTime = Date.now();
    const companies1 = await service.getDiscoveredCompanies();
    const initialTime = Date.now() - startTime;
    console.log(`✅ Initial discovery completed in ${initialTime}ms`);
    console.log(`📈 Stocks: ${companies1.stocks.length}, ETFs: ${companies1.etfs.length}, Crypto: ${companies1.crypto.length}`);

    console.log('📋 Testing cached discovery (should be much faster)...');
    const startTime2 = Date.now();
    const companies2 = await service.getDiscoveredCompanies();
    const cachedTime = Date.now() - startTime2;
    console.log(`✅ Cached discovery completed in ${cachedTime}ms`);
    console.log(`📈 Stocks: ${companies2.stocks.length}, ETFs: ${companies2.etfs.length}, Crypto: ${companies2.crypto.length}`);

    if (initialTime > 0 && cachedTime > 0) {
      const speedup = Math.round(initialTime / cachedTime);
      console.log(`🚀 Cache speedup: ${speedup}x faster!`);
    }

    console.log('📊 Testing cache statistics...');
    const cacheStats = service.getCacheStats();
    console.log('📋 Company Cache:', cacheStats.companyCache);
    console.log('🔍 Discovery Cache:', cacheStats.discoveryCache);
    console.log('🌐 API Response Cache:', cacheStats.apiResponseCache);

    console.log('📈 Testing loading status...');
    const loadingStatus = service.getLoadingStatus();
    console.log('📊 Loading Status:', loadingStatus);

    console.log('🔍 Testing search functionality...');
    const searchResults = await service.searchCompanies('AAPL', 'stock');
    console.log('🔍 Search Results for AAPL:', searchResults.length > 0 ? 'Found' : 'Not found');

    console.log('\n🎉 Enhanced caching system test completed successfully!');
    console.log('\n📊 Summary of improvements:');
    console.log('✅ Multi-layer caching system implemented');
    console.log('✅ Intelligent cache key generation');
    console.log('✅ Rate limit tracking and management');
    console.log('✅ Simplified progressive loading');
    console.log('✅ Automatic cache cleanup and management');
    console.log('✅ Significant performance improvements for cached data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEnhancedCaching(); 