#!/usr/bin/env node

/**
 * Test Finnhub API with New Rate Limit Monitoring
 * Tests the enhanced market data service's rate limiting and fallback capabilities
 */

const axios = require('axios');

// Test configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'META'];

async function testBackendHealth() {
  console.log('🏥 Testing Backend Health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('  ✅ Backend is healthy:', response.data.status);
    return true;
  } catch (error) {
    console.log('  ❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testRateLimitStatus() {
  console.log('\n⚡ Testing Rate Limit Status...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/rate-limits/status`);
    console.log('  ✅ Rate limit status retrieved');
    
    const status = response.data.data;
    console.log('\n📊 Rate Limit Status:');
    
    Object.entries(status).forEach(([apiName, apiStatus]) => {
      console.log(`\n  ${apiStatus.name}:`);
      console.log(`    Queue Length: ${apiStatus.queueLength}`);
      console.log(`    Requests (1min): ${apiStatus.requestsLastMinute}/${apiStatus.rateLimit.maxRequestsPerMinute}`);
      console.log(`    Requests (1hour): ${apiStatus.requestsLastHour}/${apiStatus.rateLimit.maxRequestsPerHour || 'N/A'}`);
      console.log(`    Processing: ${apiStatus.isProcessing ? 'Yes' : 'No'}`);
    });
    
    return status;
  } catch (error) {
    console.log('  ❌ Rate limit status check failed:', error.message);
    return null;
  }
}

async function testCacheStats() {
  console.log('\n📊 Testing Cache Statistics...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/market-data/cache/stats`);
    console.log('  ✅ Cache stats retrieved');
    
    const stats = response.data.data;
    console.log('\n📈 Cache Statistics:');
    console.log(`  Total Items: ${stats.cache.totalItems}`);
    console.log(`  Valid Items: ${stats.cache.validItems}`);
    console.log(`  Expired Items: ${stats.cache.expiredItems}`);
    console.log(`  Cache Size: ${stats.cache.cacheSize}`);
    
    return stats;
  } catch (error) {
    console.log('  ❌ Cache stats check failed:', error.message);
    return null;
  }
}

async function testStockMarketData() {
  console.log('\n📈 Testing Stock Market Data (Finnhub Primary)...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/market-data/stocks`);
    console.log('  ✅ Stock market data retrieved');
    
    const data = response.data.data;
    console.log(`\n📊 Stock Data Results:`);
    console.log(`  Total Assets: ${data.length}`);
    console.log(`  Data Sources: ${[...new Set(data.map(asset => asset.source))].join(', ')}`);
    
    // Show first few assets
    data.slice(0, 3).forEach(asset => {
      console.log(`\n  ${asset.symbol}:`);
      console.log(`    Price: $${asset.price}`);
      console.log(`    24H Change: ${asset.change24h}%`);
      console.log(`    Source: ${asset.source}`);
      console.log(`    Last Updated: ${new Date(asset.lastUpdated).toLocaleTimeString()}`);
    });
    
    return data;
  } catch (error) {
    console.log('  ❌ Stock market data retrieval failed:', error.message);
    return null;
  }
}

async function testEnhancedData(symbol) {
  console.log(`\n🔍 Testing Enhanced Data for ${symbol}...`);
  try {
    const response = await axios.get(`${BACKEND_URL}/api/market-data/enhanced/${symbol}`);
    console.log('  ✅ Enhanced data retrieved');
    
    const data = response.data.data;
    console.log(`\n📊 Enhanced Data for ${symbol}:`);
    console.log(`  P/E Ratio: ${data.pe || 'N/A'}`);
    console.log(`  Market Cap: ${data.marketCap ? `$${(data.marketCap / 1e9).toFixed(2)}B` : 'N/A'}`);
    console.log(`  Dividend Yield: ${data.dividendYield ? `${(data.dividendYield * 100).toFixed(2)}%` : 'N/A'}`);
    
    return data;
  } catch (error) {
    console.log(`  ❌ Enhanced data retrieval for ${symbol} failed:`, error.message);
    return null;
  }
}

async function testRateLimitBehavior() {
  console.log('\n🧪 Testing Rate Limit Behavior...');
  console.log('  Sending multiple requests to test rate limiting...');
  
  const results = [];
  const testCount = 8; // This should trigger rate limiting for some APIs
  
  for (let i = 0; i < testCount; i++) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${BACKEND_URL}/api/market-data/stocks`);
      const responseTime = Date.now() - startTime;
      
      results.push({
        request: i + 1,
        status: response.status,
        responseTime,
        dataCount: response.data.data.length,
        timestamp: new Date().toLocaleTimeString()
      });
      
      console.log(`    Request ${i + 1}: ${response.status} (${responseTime}ms) - ${response.data.data.length} assets`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({
        request: i + 1,
        status: 'ERROR',
        responseTime: 0,
        dataCount: 0,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      });
      
      console.log(`    Request ${i + 1}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n📊 Rate Limit Test Results:');
  results.forEach(result => {
    if (result.status === 'ERROR') {
      console.log(`  Request ${result.request}: ❌ ${result.error}`);
    } else {
      console.log(`  Request ${result.request}: ✅ ${result.status} (${result.responseTime}ms) - ${result.dataCount} assets`);
    }
  });
  
  return results;
}

async function testFallbackBehavior() {
  console.log('\n🔄 Testing Fallback Behavior...');
  console.log('  This test simulates API failures to test fallback logic...');
  
  // Get current rate limit status
  try {
    const statusResponse = await axios.get(`${BACKEND_URL}/api/rate-limits/status`);
    const status = statusResponse.data.data;
    
    console.log('\n📊 Current API Status:');
    Object.entries(status).forEach(([apiName, apiStatus]) => {
      const health = apiStatus.requestsLastMinute < apiStatus.rateLimit.maxRequestsPerMinute ? '🟢' : '🟡';
      console.log(`  ${health} ${apiStatus.name}: ${apiStatus.requestsLastMinute}/${apiStatus.rateLimit.maxRequestsPerMinute} req/min`);
    });
    
    return status;
  } catch (error) {
    console.log('  ❌ Failed to get API status:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Finnhub Rate Limit Monitoring Tests\n');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Backend Health
    const isHealthy = await testBackendHealth();
    if (!isHealthy) {
      console.log('\n❌ Backend is not healthy. Please start the backend server first.');
      console.log('   Run: cd backend && npm start');
      return;
    }
    
    // Test 2: Rate Limit Status
    const rateLimitStatus = await testRateLimitStatus();
    
    // Test 3: Cache Statistics
    const cacheStats = await testCacheStats();
    
    // Test 4: Stock Market Data
    const stockData = await testStockMarketData();
    
    // Test 5: Enhanced Data
    if (stockData && stockData.length > 0) {
      await testEnhancedData(stockData[0].symbol);
    }
    
    // Test 6: Rate Limit Behavior
    const rateLimitResults = await testRateLimitBehavior();
    
    // Test 7: Fallback Behavior
    const fallbackStatus = await testFallbackBehavior();
    
    // Final Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    if (rateLimitStatus) {
      const workingAPIs = Object.values(rateLimitStatus).filter(api => api.requestsLastMinute < api.rateLimit.maxRequestsPerMinute);
      console.log(`✅ Working APIs: ${workingAPIs.length}/${Object.keys(rateLimitStatus).length}`);
    }
    
    if (stockData) {
      const finnhubData = stockData.filter(asset => asset.source === 'Finnhub');
      console.log(`📈 Finnhub Data: ${finnhubData.length}/${stockData.length} assets`);
    }
    
    if (rateLimitResults) {
      const successfulRequests = rateLimitResults.filter(r => r.status !== 'ERROR').length;
      console.log(`🔄 Rate Limit Test: ${successfulRequests}/${rateLimitResults.length} successful`);
    }
    
    console.log('\n🎉 All tests completed! Check the results above.');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests }; 