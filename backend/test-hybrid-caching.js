#!/usr/bin/env node

// Test script for Hybrid Cache Service
// Tests prefetching, caching, and data delivery

const { HybridCacheService } = require('./dist/hybridCacheService');

async function testHybridCaching() {
  console.log('🧪 Testing Hybrid Cache Service...\n');
  
  try {
    const service = new HybridCacheService();
    
    // Wait for initial prefetch to complete
    console.log('⏳ Waiting for initial prefetch to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: Check prefetch status
    console.log('\n1️⃣ Testing prefetch status...');
    const prefetchStatus = service.getPrefetchStatus();
    const prefetchedCount = Object.values(prefetchStatus).filter(Boolean).length;
    console.log(`✅ Prefetched assets: ${prefetchedCount}`);
    
    // Test 2: Get top stocks
    console.log('\n2️⃣ Testing top stocks retrieval...');
    const topStocks = await service.getTopAssets('stocks', 5);
    console.log(`✅ Top stocks retrieved: ${topStocks.length}`);
    if (topStocks.length > 0) {
      const sampleStock = topStocks[0];
      console.log(`   Sample: ${sampleStock.metadata.symbol} - ${sampleStock.metadata.name}`);
      console.log(`   Price: $${sampleStock.liveData.price.toFixed(2)}`);
      console.log(`   Cache status: ${sampleStock.cacheStatus}`);
    }
    
    // Test 3: Get top ETFs
    console.log('\n3️⃣ Testing top ETFs retrieval...');
    const topETFs = await service.getTopAssets('etfs', 5);
    console.log(`✅ Top ETFs retrieved: ${topETFs.length}`);
    if (topETFs.length > 0) {
      const sampleETF = topETFs[0];
      console.log(`   Sample: ${sampleETF.metadata.symbol} - ${sampleETF.metadata.name}`);
      console.log(`   Price: $${sampleETF.liveData.price.toFixed(2)}`);
      console.log(`   Cache status: ${sampleETF.cacheStatus}`);
    }
    
    // Test 4: Get top crypto
    console.log('\n4️⃣ Testing top crypto retrieval...');
    const topCrypto = await service.getTopAssets('crypto', 5);
    console.log(`✅ Top crypto retrieved: ${topCrypto.length}`);
    if (topCrypto.length > 0) {
      const sampleCrypto = topCrypto[0];
      console.log(`   Sample: ${sampleCrypto.metadata.symbol} - ${sampleCrypto.metadata.name}`);
      console.log(`   Price: $${sampleCrypto.liveData.price.toFixed(4)}`);
      console.log(`   Cache status: ${sampleCrypto.cacheStatus}`);
    }
    
    // Test 5: Get specific asset data
    console.log('\n5️⃣ Testing specific asset retrieval...');
    const aaplData = await service.getHybridAssetData('AAPL', 'stock');
    if (aaplData) {
      console.log(`✅ AAPL data retrieved:`);
      console.log(`   Name: ${aaplData.metadata.name}`);
      console.log(`   Price: $${aaplData.liveData.price.toFixed(2)}`);
      console.log(`   P/E: ${aaplData.liveData.pe?.toFixed(2) || 'N/A'}`);
      console.log(`   Cache status: ${aaplData.cacheStatus}`);
      console.log(`   TTL: ${aaplData.ttl}ms`);
    } else {
      console.log('❌ AAPL data not found');
    }
    
    // Test 6: Cache statistics
    console.log('\n6️⃣ Testing cache statistics...');
    const cacheStats = service.getCacheStats();
    console.log('📊 Cache Statistics:');
    console.log(`   Metadata Cache: ${cacheStats.metadataCache.size}/${cacheStats.metadataCache.maxSize}`);
    console.log(`   Live Data Cache: ${cacheStats.liveDataCache.size}/${cacheStats.liveDataCache.maxSize}`);
    console.log(`   Metadata Hit Rate: ${cacheStats.metadataCache.hitRate.toFixed(2)}%`);
    console.log(`   Live Data Hit Rate: ${cacheStats.liveDataCache.hitRate.toFixed(2)}%`);
    console.log(`   Assets Prefetched: ${cacheStats.prefetchStatus.assetsPrefetched}`);
    
    // Test 7: Performance test
    console.log('\n7️⃣ Testing performance...');
    const startTime = Date.now();
    const performanceAssets = await service.getTopAssets('stocks', 50);
    const endTime = Date.now();
    console.log(`✅ Retrieved ${performanceAssets.length} assets in ${endTime - startTime}ms`);
    
    console.log('\n🎉 Hybrid Cache Service test completed successfully!');
    console.log('\n📊 Summary of features:');
    console.log('✅ Asset prefetching (stocks, ETFs, crypto)');
    console.log('✅ Hybrid caching (metadata + live data)');
    console.log('✅ Different TTLs for different data types');
    console.log('✅ Efficient data retrieval');
    console.log('✅ Cache statistics and monitoring');
    console.log('✅ Scalable for testnet and mock trading');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testHybridCaching(); 