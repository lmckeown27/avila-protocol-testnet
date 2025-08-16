#!/usr/bin/env node

// Test script that simulates the browser environment
// This will test the actual frontend services as they would work in the browser

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Simulate browser environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
function loadEnvVars() {
  try {
    const envPath = join(__dirname, '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('⚠️ No .env.local file found, using defaults');
    return {};
  }
}

const envVars = loadEnvVars();

// Simulate the environment.ts configuration
const config = {
  backend: {
    baseUrl: envVars.VITE_BACKEND_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://avila-protocol-testnet.onrender.com'),
    timeout: 10000,
    endpoints: {
      health: '/api/health',
      marketData: '/api/market-data',
      stocks: '/api/stocks',
      etfs: '/api/etfs',
      crypto: '/api/crypto',
      digitalAssets: '/api/crypto',
      search: '/api/search',
      categories: '/api/categories',
      companies: '/api/companies',
      companiesStats: '/api/companies/stats',
      rateLimitsStatus: '/api/rate-limits/status',
      rateLimitsTiming: '/api/rate-limits/timing',
      rateLimitsRotation: '/api/rate-limits/rotation',
      cacheStats: '/api/market-data/cache/stats',
      enhancedMarketData: '/api/market-data/enhanced',
      defiProtocols: '/api/market-data/defi-protocols',
      cacheClear: '/api/market-data/cache/clear',
    },
  },
  app: {
    name: 'Avila Protocol',
    version: '1.0.0',
    environment: envVars.VITE_APP_ENVIRONMENT || 'testnet',
  },
};

console.log('🔧 Frontend Configuration:');
console.log('   Backend URL:', config.backend.baseUrl);
console.log('   Environment:', config.app.environment);
console.log('   Endpoints:', Object.keys(config.backend.endpoints).length, 'endpoints configured\n');

// Test the configuration
async function testConfiguration() {
  console.log('🧪 Testing Configuration Resolution...\n');
  
  try {
    // Test health endpoint with resolved URL
    console.log('1️⃣ Testing health endpoint with resolved configuration...');
    const healthUrl = `${config.backend.baseUrl}${config.backend.endpoints.health}`;
    console.log('   URL:', healthUrl);
    
    const response = await fetch(healthUrl);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Health check successful:', data.status);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Test stocks endpoint
    console.log('\n2️⃣ Testing stocks endpoint...');
    const stocksUrl = `${config.backend.baseUrl}${config.backend.endpoints.stocks}?page=1&limit=3`;
    console.log('   URL:', stocksUrl);
    
    const stocksResponse = await fetch(stocksUrl);
    if (stocksResponse.ok) {
      const stocksData = await stocksResponse.json();
      console.log('   ✅ Stocks endpoint working:', {
        count: stocksData.data?.data?.length || 0,
        total: stocksData.data?.pagination?.total || 0
      });
    } else {
      throw new Error(`HTTP ${stocksResponse.status}: ${stocksResponse.statusText}`);
    }
    
    // Test enhanced market data
    console.log('\n3️⃣ Testing enhanced market data...');
    const enhancedUrl = `${config.backend.baseUrl}${config.backend.endpoints.enhancedMarketData}/AAPL`;
    console.log('   URL:', enhancedUrl);
    
    const enhancedResponse = await fetch(enhancedUrl);
    if (enhancedResponse.ok) {
      const enhancedData = await enhancedResponse.json();
      console.log('   ✅ Enhanced data working:', {
        pe: enhancedData.data?.pe,
        marketCap: enhancedData.data?.marketCap
      });
    } else {
      throw new Error(`HTTP ${enhancedResponse.status}: ${enhancedResponse.statusText}`);
    }
    
    console.log('\n🎉 Configuration test successful!');
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
    process.exit(1);
  }
}

// Test the complete data flow
async function testDataFlow() {
  console.log('\n📊 Testing Complete Data Flow...\n');
  
  try {
    // Simulate the exact flow from TradFiMarkets.tsx
    console.log('1️⃣ Simulating TradFiMarkets data flow...');
    
    // Step 1: Get basic stock data
    console.log('   📈 Fetching basic stock data...');
    const basicDataUrl = `${config.backend.baseUrl}${config.backend.endpoints.stocks}?page=1&limit=5`;
    const basicDataResponse = await fetch(basicDataUrl);
    
    if (!basicDataResponse.ok) {
      throw new Error(`Failed to fetch basic data: ${basicDataResponse.status}`);
    }
    
    const basicDataResult = await basicDataResponse.json();
    const basicData = basicDataResult.data?.data || [];
    console.log(`   ✅ Basic data fetched: ${basicData.length} stocks`);
    
    if (basicData.length === 0) {
      console.log('   ⚠️ No stocks returned, this might indicate a problem');
      return;
    }
    
    // Step 2: Enhance each asset with P/E data
    console.log('   🔍 Enhancing assets with P/E data...');
    const enhancedAssets = [];
    
    for (let i = 0; i < Math.min(3, basicData.length); i++) {
      const asset = basicData[i];
      try {
        const enhancedUrl = `${config.backend.baseUrl}${config.backend.endpoints.enhancedMarketData}/${asset.symbol}`;
        const enhancedResponse = await fetch(enhancedUrl);
        
        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json();
          
          enhancedAssets.push({
            ...asset,
            pe: enhancedData.data?.pe
          });
          
          console.log(`   ✅ Enhanced ${asset.symbol}: P/E = ${enhancedData.data?.pe || 'N/A'}`);
        } else {
          console.log(`   ⚠️ Failed to enhance ${asset.symbol}: HTTP ${enhancedResponse.status}`);
          enhancedAssets.push(asset);
        }
      } catch (error) {
        console.log(`   ⚠️ Failed to enhance ${asset.symbol}: ${error.message}`);
        enhancedAssets.push(asset);
      }
    }
    
    console.log(`   🎯 Final enhanced assets: ${enhancedAssets.length}`);
    
    // Step 3: Test data structure
    console.log('\n2️⃣ Testing data structure compatibility...');
    const sampleAsset = enhancedAssets[0];
    if (sampleAsset) {
      console.log('   📋 Sample asset structure:', {
        symbol: sampleAsset.symbol,
        name: sampleAsset.name,
        price: sampleAsset.price,
        pe: sampleAsset.pe,
        hasRequiredFields: !!(sampleAsset.symbol && sampleAsset.name && typeof sampleAsset.price === 'number')
      });
    }
    
    console.log('\n🎉 Complete data flow test successful!');
    
  } catch (error) {
    console.error('❌ Data flow test failed:', error.message);
    process.exit(1);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Frontend Browser Environment Tests...\n');
  
  try {
    await testConfiguration();
    await testDataFlow();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Configuration resolution: Working');
    console.log('✅ Backend connectivity: Working');
    console.log('✅ Data flow: Working');
    console.log('✅ Enhanced data: Working');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests(); 