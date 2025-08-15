#!/usr/bin/env node

/**
 * API Rate Limit Testing Script
 * Tests the rate limits of all APIs used in the Avila Protocol market data service
 */

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

// API Configuration with keys from conversation
const API_CONFIG = {
  // TradFi APIs
  finnhub: {
    name: 'Finnhub',
    baseUrl: 'https://finnhub.io/api/v1',
    token: 'd2ehcv9r01qlu2qur8rgd2ehcv9r01qlu2qur8s0', // From conversation
    rateLimit: 60, // requests per minute
    testEndpoint: '/quote',
    testParams: { symbol: 'AAPL' }
  },
  alphaVantage: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co/query',
    token: 'demo', // Will use demo key for testing
    rateLimit: 5, // requests per minute
    testEndpoint: '',
    testParams: { function: 'GLOBAL_QUOTE', symbol: 'AAPL', apikey: 'demo' }
  },
  twelveData: {
    name: 'Twelve Data',
    baseUrl: 'https://api.twelvedata.com',
    token: 'demo', // Will use demo key for testing
    rateLimit: 8, // requests per minute
    testEndpoint: '/quote',
    testParams: { symbol: 'AAPL', apikey: 'demo' }
  },

  // Crypto APIs
  coinGecko: {
    name: 'CoinGecko',
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: 50, // requests per minute
    testEndpoint: '/simple/price',
    testParams: { ids: 'bitcoin', vs_currencies: 'usd' }
  },
  coinMarketCap: {
    name: 'CoinMarketCap',
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
    token: '7a32feb4-5f1f-4c7d-8fcd-f7b490778ea7', // From conversation
    rateLimit: 10, // requests per minute
    testEndpoint: '/cryptocurrency/quotes/latest',
    testParams: { symbol: 'BTC' },
    headers: { 'X-CMC_PRO_API_KEY': '7a32feb4-5f1f-4c7d-8fcd-f7b490778ea7' }
  },

  // DeFi APIs
  defiLlama: {
    name: 'DeFi Llama',
    baseUrl: 'https://api.llama.fi',
    rateLimit: 100, // requests per minute
    testEndpoint: '/protocols',
    testParams: {}
  }
};

// Test assets
const TEST_ASSETS = {
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ'],
  etfs: ['SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', 'XLF', 'XLE'],
  crypto: ['bitcoin', 'ethereum', 'chainlink', 'cardano', 'solana', 'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'matic-network']
};

class RateLimitTester {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  async testAPI(apiName, config) {
    console.log(`\n🧪 Testing ${apiName}...`);
    
    const results = {
      name: config.name,
      maxRequestsPerMinute: 0,
      averageResponseTime: 0,
      errors: [],
      rateLimitHit: false,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0
    };

    // Test different request frequencies
    const frequencies = [1, 2, 5, 10, 20, 30, 60, 120]; // requests per minute
    
    for (const freq of frequencies) {
      console.log(`  Testing ${freq} requests/minute...`);
      
      const requestInterval = 60000 / freq; // milliseconds between requests
      const testDuration = 60000; // 1 minute test
      const maxRequests = Math.min(freq, 120); // Cap at 120 requests for safety
      
      let requestCount = 0;
      let successCount = 0;
      let totalTime = 0;
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration && requestCount < maxRequests) {
        try {
          const requestStart = Date.now();
          
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
          
          const responseTime = Date.now() - requestStart;
          totalTime += responseTime;
          successCount++;
          
          // Check for rate limit headers or error messages
          if (response.status === 429 || 
              response.data?.error?.includes('rate limit') ||
              response.data?.error?.includes('too many requests')) {
            results.rateLimitHit = true;
            results.maxRequestsPerMinute = freq - 1;
            console.log(`    ⚠️  Rate limit hit at ${freq} requests/minute`);
            break;
          }
          
        } catch (error) {
          if (error.response?.status === 429) {
            results.rateLimitHit = true;
            results.maxRequestsPerMinute = freq - 1;
            console.log(`    ⚠️  Rate limit hit at ${freq} requests/minute (429 status)`);
            break;
          } else if (error.response?.status === 403) {
            results.errors.push(`403 Forbidden at ${freq} req/min: ${error.response.data?.message || 'Access denied'}`);
            console.log(`    ❌ 403 Forbidden at ${freq} requests/minute`);
            break;
          } else {
            results.errors.push(`Error at ${freq} req/min: ${error.message}`);
            console.log(`    ❌ Error at ${freq} requests/minute: ${error.message}`);
          }
        }
        
        requestCount++;
        
        // Wait before next request
        if (requestCount < maxRequests) {
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
      }
      
      if (results.rateLimitHit) {
        break;
      }
      
      // If we get here, this frequency worked
      results.maxRequestsPerMinute = freq;
      results.successfulRequests = successCount;
      results.totalResponseTime = totalTime;
      results.averageResponseTime = totalTime / successCount;
      
      console.log(`    ✅ ${freq} requests/minute successful`);
      
      // Add a small delay between frequency tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!results.rateLimitHit) {
      results.maxRequestsPerMinute = results.maxRequestsPerMinute || 120;
    }
    
    console.log(`  📊 ${apiName} Results: Max ${results.maxRequestsPerMinute} req/min, Avg response: ${results.averageResponseTime.toFixed(2)}ms`);
    
    return results;
  }

  async testAllAPIs() {
    console.log('🚀 Starting API Rate Limit Testing...\n');
    
    for (const [apiName, config] of Object.entries(API_CONFIG)) {
      try {
        this.results[apiName] = await this.testAPI(apiName, config);
      } catch (error) {
        console.error(`❌ Error testing ${apiName}:`, error.message);
        this.results[apiName] = {
          name: config.name,
          error: error.message,
          maxRequestsPerMinute: 0,
          averageResponseTime: 0
        };
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - this.startTime,
      summary: {
        totalAPIs: Object.keys(this.results).length,
        workingAPIs: Object.values(this.results).filter(r => !r.error).length,
        failedAPIs: Object.values(this.results).filter(r => r.error).length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for rate limit issues
    const lowRateLimitAPIs = Object.entries(this.results)
      .filter(([_, result]) => result.maxRequestsPerMinute < 10 && !result.error);
    
    if (lowRateLimitAPIs.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `Low rate limit APIs detected: ${lowRateLimitAPIs.map(([name, result]) => `${name} (${result.maxRequestsPerMinute} req/min)`).join(', ')}`,
        suggestion: 'Consider upgrading to paid tiers or implementing aggressive caching'
      });
    }
    
    // Check for errors
    const errorAPIs = Object.entries(this.results)
      .filter(([_, result]) => result.error);
    
    if (errorAPIs.length > 0) {
      recommendations.push({
        type: 'error',
        message: `APIs with errors: ${errorAPIs.map(([name, _]) => name).join(', ')}`,
        suggestion: 'Check API keys and service status'
      });
    }
    
    // Performance recommendations
    const slowAPIs = Object.entries(this.results)
      .filter(([_, result]) => result.averageResponseTime > 2000 && !result.error);
    
    if (slowAPIs.length > 0) {
      recommendations.push({
        type: 'info',
        message: `Slow responding APIs: ${slowAPIs.map(([name, result]) => `${name} (${result.averageResponseTime.toFixed(0)}ms)`).join(', ')}`,
        suggestion: 'Consider implementing request queuing or fallback strategies'
      });
    }
    
    return recommendations;
  }

  async saveReport(report) {
    const reportPath = path.join(process.cwd(), 'api_rate_limit_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  printSummary() {
    console.log('\n📊 API Rate Limit Test Summary');
    console.log('================================');
    
    Object.entries(this.results).forEach(([apiName, result]) => {
      if (result.error) {
        console.log(`❌ ${result.name}: ${result.error}`);
      } else {
        console.log(`✅ ${result.name}: Max ${result.maxRequestsPerMinute} req/min, Avg ${result.averageResponseTime.toFixed(0)}ms`);
      }
    });
    
    const workingAPIs = Object.values(this.results).filter(r => !r.error);
    const avgResponseTime = workingAPIs.reduce((sum, r) => sum + r.averageResponseTime, 0) / workingAPIs.length;
    
    console.log(`\n📈 Overall Performance:`);
    console.log(`   Working APIs: ${workingAPIs.length}/${Object.keys(this.results).length}`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  }
}

// Main execution
async function main() {
  try {
    const tester = new RateLimitTester();
    await tester.testAllAPIs();
    
    const report = tester.generateReport();
    await tester.saveReport(report);
    tester.printSummary();
    
    console.log('\n🎉 Rate limit testing completed!');
    
  } catch (error) {
    console.error('❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run the test
main(); 