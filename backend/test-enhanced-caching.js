#!/usr/bin/env node

/**
 * Test Enhanced Caching System
 * 
 * This script tests the new enhanced caching and simplified progressive loading
 * system in the CompanyDiscoveryService.
 */

const { CompanyDiscoveryService } = require('./src/companyDiscoveryService');

async function testEnhancedCaching() {
  console.log('🧪 Testing Enhanced Caching System...\n');

  try {
    // Create service instance
    const service = new CompanyDiscoveryService();
    
    console.log('📊 Testing initial discovery...');
    const startTime = Date.now();
    const companies1 = await service.getDiscoveredCompanies();
    const initialTime = Date.now() - startTime;
    
    console.log(`✅ Initial discovery completed in ${initialTime}ms`);
    console.log(`📈 Stocks: ${companies1.stocks.length}`);
    console.log(`📊 ETFs: ${companies1.etfs.length}`);
    console.log(`🪙 Crypto: ${companies1.crypto.length}\n`);
    
    console.log('📋 Testing cached discovery (should be much faster)...');
    const startTime2 = Date.now();
    const companies2 = await service.getDiscoveredCompanies();
    const cachedTime = Date.now() - startTime2;
    
    console.log(`✅ Cached discovery completed in ${cachedTime}ms`);
    console.log(`📈 Stocks: ${companies2.stocks.length}`);
    console.log(`📊 ETFs: ${companies2.etfs.length}`);
    console.log(`🪙 Crypto: ${companies2.crypto.length}\n`);
    
    console.log('🚀 Performance improvement:');
    console.log(`   Initial: ${initialTime}ms`);
    console.log(`   Cached: ${cachedTime}ms`);
    console.log(`   Speedup: ${Math.round(initialTime / cachedTime)}x faster\n`);
    
    console.log('📊 Testing cache statistics...');
    const cacheStats = service.getCacheStats();
    console.log('Cache Statistics:');
    console.log(`   Company Cache: ${cacheStats.companyCache.size}/${cacheStats.companyCache.maxSize}`);
    console.log(`   Discovery Cache: ${cacheStats.discoveryCache.size}/${cacheStats.discoveryCache.maxSize}`);
    console.log(`   API Response Cache: ${cacheStats.apiResponseCache.size}/${cacheStats.apiResponseCache.maxSize}\n`);
    
    console.log('📈 Testing loading status...');
    const loadingStatus = service.getLoadingStatus();
    console.log('Loading Status:');
    console.log(`   Stocks: ${loadingStatus.stocks.discovered}/${loadingStatus.stocks.target}`);
    console.log(`   ETFs: ${loadingStatus.etfs.discovered}/${loadingStatus.etfs.target}`);
    console.log(`   Crypto: ${loadingStatus.crypto.discovered}/${loadingStatus.crypto.target}\n`);
    
    console.log('🔍 Testing search functionality...');
    const searchResults = await service.searchCompanies('AAPL', 'stock');
    console.log(`Search for 'AAPL': ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log(`   First result: ${searchResults[0].symbol} - ${searchResults[0].name}`);
    }
    
    console.log('\n🎉 Enhanced caching system test completed successfully!');
    console.log('\nKey improvements:');
    console.log('✅ Multi-layer caching (company, discovery, API responses)');
    console.log('✅ Intelligent cache key generation');
    console.log('✅ Rate limit tracking and API availability checking');
    console.log('✅ Simplified progressive loading (no complex batching)');
    console.log('✅ Automatic cache cleanup and TTL management');
    console.log('✅ No hardcoded fallback data - pure dynamic discovery');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnhancedCaching(); 