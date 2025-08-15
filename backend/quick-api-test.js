#!/usr/bin/env node

/**
 * Quick API Test Script
 * Tests each API individually to check connectivity and basic functionality
 */

const axios = require('axios');

// API Configuration
const API_CONFIG = {
  finnhub: {
    name: 'Finnhub',
    baseUrl: 'https://finnhub.io/api/v1',
    token: 'd2ehcv9r01qlu2qur8rgd2ehcv9r01qlu2qur8s0',
    testEndpoint: '/quote',
    testParams: { symbol: 'AAPL' }
  },
  alphaVantage: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co/query',
    testEndpoint: '',
    testParams: { function: 'GLOBAL_QUOTE', symbol: 'AAPL', apikey: 'demo' }
  },
  twelveData: {
    name: 'Twelve Data',
    baseUrl: 'https://api.twelvedata.com',
    testEndpoint: '/quote',
    testParams: { symbol: 'AAPL', apikey: 'demo' }
  },
  coinGecko: {
    name: 'CoinGecko',
    baseUrl: 'https://api.coingecko.com/api/v3',
    testEndpoint: '/simple/price',
    testParams: { ids: 'bitcoin', vs_currencies: 'usd' }
  },
  coinMarketCap: {
    name: 'CoinMarketCap',
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
    testEndpoint: '/cryptocurrency/quotes/latest',
    testParams: { symbol: 'BTC' },
    headers: { 'X-CMC_PRO_API_KEY': '7a32feb4-5f1f-4c7d-8fcd-f7b490778ea7' }
  },
  defiLlama: {
    name: 'DeFi Llama',
    baseUrl: 'https://api.llama.fi',
    testEndpoint: '/protocols',
    testParams: {}
  }
};

async function testAPI(apiName, config) {
  console.log(`\n🧪 Testing ${config.name}...`);
  
  try {
    const startTime = Date.now();
    
    let response;
    if (config.headers) {
      response = await axios.get(`${config.baseUrl}${config.testEndpoint}`, {
        params: config.testParams,
        headers: config.headers,
        timeout: 10000
      });
    } else {
      response = await axios.get(`${config.baseUrl}${config.testEndpoint}`, {
        params: config.testParams,
        timeout: 10000
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    console.log(`  ✅ Success! Status: ${response.status}`);
    console.log(`  ⏱️  Response Time: ${responseTime}ms`);
    console.log(`  📊 Data Received: ${response.data ? 'Yes' : 'No'}`);
    
    if (response.data && typeof response.data === 'object') {
      const dataKeys = Object.keys(response.data);
      console.log(`  🔑 Response Keys: ${dataKeys.slice(0, 5).join(', ')}${dataKeys.length > 5 ? '...' : ''}`);
    }
    
    return {
      name: config.name,
      status: 'success',
      responseTime,
      statusCode: response.status,
      hasData: !!response.data
    };
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`  📡 Status Code: ${error.response.status}`);
      console.log(`  📝 Error Details: ${error.response.data?.error || error.response.data?.message || 'No details'}`);
      
      if (error.response.status === 401) {
        console.log(`  🔑 Issue: Authentication failed - check API key`);
      } else if (error.response.status === 403) {
        console.log(`  🚫 Issue: Access forbidden - check API permissions`);
      } else if (error.response.status === 429) {
        console.log(`  ⚠️  Issue: Rate limit exceeded`);
      }
    }
    
    return {
      name: config.name,
      status: 'error',
      error: error.message,
      statusCode: error.response?.status
    };
  }
}

async function runQuickTest() {
  console.log('🚀 Quick API Connectivity Test\n');
  console.log('This test will check each API individually for basic connectivity and functionality.\n');
  
  const results = {};
  
  for (const [apiName, config] of Object.entries(API_CONFIG)) {
    results[apiName] = await testAPI(apiName, config);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  
  const successful = Object.values(results).filter(r => r.status === 'success');
  const failed = Object.values(results).filter(r => r.status === 'error');
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 Working APIs:');
    successful.forEach(result => {
      console.log(`  • ${result.name} (${result.responseTime}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️  APIs with Issues:');
    failed.forEach(result => {
      console.log(`  • ${result.name}: ${result.error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (failed.length > 0) {
    console.log('  • Check API keys for failed services');
    console.log('  • Verify API service status');
    console.log('  • Consider upgrading to paid tiers if needed');
  }
  
  if (successful.length > 0) {
    console.log('  • Working APIs can be used for rate limit testing');
    console.log('  • Consider implementing caching for better performance');
  }
  
  console.log('\n🎉 Quick test completed!');
}

// Run the test
runQuickTest().catch(console.error); 