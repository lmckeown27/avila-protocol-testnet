#!/usr/bin/env node

/**
 * Working API Rate Limit Test Script
 * Tests rate limits for APIs that passed connectivity tests
 */

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

// Only test working APIs
const WORKING_APIS = {
  alphaVantage: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co/query',
    rateLimit: 5, // requests per minute (free tier)
    testEndpoint: '',
    testParams: { function: 'GLOBAL_QUOTE', symbol: 'AAPL', apikey: 'demo' },
    category: 'TradFi'
  },
  twelveData: {
    name: 'Twelve Data',
    baseUrl: 'https://api.twelvedata.com',
    rateLimit: 8, // requests per minute (free tier)
    testEndpoint: '/quote',
    testParams: { symbol: 'AAPL', apikey: 'demo' },
    category: 'TradFi'
  },
  coinGecko: {
    name: 'CoinGecko',
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: 50, // requests per minute (free tier)
    testEndpoint: '/simple/price',
    testParams: { ids: 'bitcoin', vs_currencies: 'usd' },
    category: 'Digital Assets'
  },
  coinMarketCap: {
    name: 'CoinMarketCap',
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
    rateLimit: 10, // requests per minute (free tier)
    testEndpoint: '/cryptocurrency/quotes/latest',
    testParams: { symbol: 'BTC' },
    headers: { 'X-CMC_PRO_API_KEY': '7a32feb4-5f1f-4c7d-8fcd-f7b490778ea7' },
    category: 'Digital Assets'
  },
  defiLlama: {
    name: 'DeFi Llama',
    baseUrl: 'https://api.llama.fi',
    rateLimit: 100, // requests per minute (free tier)
    testEndpoint: '/protocols',
    testParams: {},
    category: 'DeFi'
  }
};

class WorkingAPIRateTester {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  async testAPIRateLimit(apiName, config) {
    console.log(`\n🧪 Testing ${config.name} Rate Limits...`);
    console.log(`   Category: ${config.category}`);
    console.log(`   Expected Limit: ${config.rateLimit} req/min`);
    
    const results = {
      name: config.name,
      category: config.category,
      expectedRateLimit: config.rateLimit,
      maxRequestsPerMinute: 0,
      averageResponseTime: 0,
      errors: [],
      rateLimitHit: false,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      testDetails: []
    };

    // Test frequencies around the expected limit
    const frequencies = [
      Math.max(1, Math.floor(config.rateLimit * 0.5)), // 50% of limit
      Math.max(1, Math.floor(config.rateLimit * 0.8)), // 80% of limit
      config.rateLimit, // 100% of limit
      Math.floor(config.rateLimit * 1.2), // 120% of limit
      Math.floor(config.rateLimit * 1.5), // 150% of limit
      Math.floor(config.rateLimit * 2)    // 200% of limit
    ];
    
    for (const freq of frequencies) {
      console.log(`  Testing ${freq} requests/minute...`);
      
      const requestInterval = 60000 / freq; // milliseconds between requests
      const testDuration = 60000; // 1 minute test
      const maxRequests = Math.min(freq, 120); // Cap at 120 requests for safety
      
      let requestCount = 0;
      let successCount = 0;
      let totalTime = 0;
      let errors = [];
      
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
          
          // Check for rate limit indicators
          if (response.status === 429 || 
              response.data?.error?.includes('rate limit') ||
              response.data?.error?.includes('too many requests') ||
              response.data?.Note?.includes('demo')) {
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
            errors.push(`403 Forbidden: ${error.response.data?.message || 'Access denied'}`);
            console.log(`    ❌ 403 Forbidden at ${freq} requests/minute`);
            break;
          } else {
            errors.push(`${error.message}`);
            console.log(`    ❌ Error at ${freq} requests/minute: ${error.message}`);
          }
        }
        
        requestCount++;
        
        // Wait before next request
        if (requestCount < maxRequests) {
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
      }
      
      // Record test details
      results.testDetails.push({
        frequency: freq,
        requestsSent: requestCount,
        successfulRequests: successCount,
        errors: errors,
        totalResponseTime: totalTime,
        averageResponseTime: successCount > 0 ? totalTime / successCount : 0
      });
      
      if (results.rateLimitHit || errors.length > 0) {
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
      results.maxRequestsPerMinute = results.maxRequestsPerMinute || config.rateLimit;
    }
    
    console.log(`  📊 Results: Max ${results.maxRequestsPerMinute} req/min, Avg response: ${results.averageResponseTime.toFixed(2)}ms`);
    
    return results;
  }

  async testAllWorkingAPIs() {
    console.log('🚀 Testing Rate Limits for Working APIs...\n');
    
    for (const [apiName, config] of Object.entries(WORKING_APIS)) {
      try {
        this.results[apiName] = await this.testAPIRateLimit(apiName, config);
      } catch (error) {
        console.error(`❌ Error testing ${apiName}:`, error.message);
        this.results[apiName] = {
          name: config.name,
          category: config.category,
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
        failedAPIs: Object.values(this.results).filter(r => r.error).length,
        categories: {
          tradFi: Object.values(this.results).filter(r => r.category === 'TradFi' && !r.error).length,
          digitalAssets: Object.values(this.results).filter(r => r.category === 'Digital Assets' && !r.error).length,
          defi: Object.values(this.results).filter(r => r.category === 'DeFi' && !r.error).length
        }
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
      apiPerformance: this.generatePerformanceSummary()
    };
    
    return report;
  }

  generatePerformanceSummary() {
    const workingAPIs = Object.values(this.results).filter(r => !r.error);
    
    const categoryPerformance = {
      tradFi: workingAPIs.filter(r => r.category === 'TradFi'),
      digitalAssets: workingAPIs.filter(r => r.category === 'Digital Assets'),
      defi: workingAPIs.filter(r => r.category === 'DeFi')
    };
    
    const summary = {};
    
    Object.entries(categoryPerformance).forEach(([category, apis]) => {
      if (apis.length > 0) {
        summary[category] = {
          count: apis.length,
          avgResponseTime: apis.reduce((sum, api) => sum + api.averageResponseTime, 0) / apis.length,
          totalRequestsPerMinute: apis.reduce((sum, api) => sum + api.maxRequestsPerMinute, 0),
          fastestAPI: apis.reduce((fastest, api) => api.averageResponseTime < fastest.averageResponseTime ? api : fastest),
          slowestAPI: apis.reduce((slowest, api) => api.averageResponseTime > slowest.averageResponseTime ? api : slowest)
        };
      }
    });
    
    return summary;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for rate limit issues
    const lowRateLimitAPIs = Object.entries(this.results)
      .filter(([_, result]) => result.maxRequestsPerMinute < 10 && !result.error);
    
    if (lowRateLimitAPIs.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `Low rate limit APIs detected: ${lowRateLimitAPIs.map(([name, result]) => `${result.name} (${result.maxRequestsPerMinute} req/min)`).join(', ')}`,
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
        message: `Slow responding APIs: ${slowAPIs.map(([name, result]) => `${result.name} (${result.averageResponseTime.toFixed(0)}ms)`).join(', ')}`,
        suggestion: 'Consider implementing request queuing or fallback strategies'
      });
    }
    
    // Category-specific recommendations
    const tradFiAPIs = Object.values(this.results).filter(r => r.category === 'TradFi' && !r.error);
    if (tradFiAPIs.length > 0) {
      const totalTradFiRateLimit = tradFiAPIs.reduce((sum, api) => sum + api.maxRequestsPerMinute, 0);
      recommendations.push({
        type: 'info',
        message: `TradFi APIs total rate limit: ${totalTradFiRateLimit} req/min`,
        suggestion: 'Consider load balancing between multiple TradFi APIs for better throughput'
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
        console.log(`✅ ${result.name} (${result.category}): Max ${result.maxRequestsPerMinute} req/min, Avg ${result.averageResponseTime.toFixed(0)}ms`);
      }
    });
    
    const workingAPIs = Object.values(this.results).filter(r => !r.error);
    const avgResponseTime = workingAPIs.reduce((sum, r) => sum + r.averageResponseTime, 0) / workingAPIs.length;
    
    console.log(`\n📈 Overall Performance:`);
    console.log(`   Working APIs: ${workingAPIs.length}/${Object.keys(this.results).length}`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    
    // Category breakdown
    const categories = {};
    workingAPIs.forEach(api => {
      categories[api.category] = (categories[api.category] || 0) + 1;
    });
    
    console.log(`\n🏷️  API Categories:`);
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} APIs`);
    });
  }
}

// Main execution
async function main() {
  try {
    const tester = new WorkingAPIRateTester();
    await tester.testAllWorkingAPIs();
    
    const report = tester.generateReport();
    await tester.saveReport(report);
    tester.printSummary();
    
    console.log('\n🎉 Rate limit testing completed!');
    console.log('📄 Check api_rate_limit_report.json for detailed results');
    
  } catch (error) {
    console.error('❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run the test
main(); 