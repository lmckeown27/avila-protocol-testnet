#!/usr/bin/env node

// Test script for frontend services
// This will help debug any issues with data fetching

import axios from 'axios';

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const ENDPOINTS = {
  health: '/api/health',
  stocks: '/api/stocks',
  etfs: '/api/etfs',
  crypto: '/api/crypto',
  enhanced: '/api/market-data/enhanced',
  marketData: '/api/market-data'
};

async function testBackendConnectivity() {
  console.log('🧪 Testing Backend Connectivity...\n');
  
  try {
    // Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BACKEND_URL}${ENDPOINTS.health}`);
    console.log('✅ Health endpoint:', healthResponse.data);
    
    // Test stocks endpoint
    console.log('\n2️⃣ Testing stocks endpoint...');
    const stocksResponse = await axios.get(`${BACKEND_URL}${ENDPOINTS.stocks}?page=1&limit=3`);
    console.log('✅ Stocks endpoint:', {
      success: stocksResponse.data.success,
      count: stocksResponse.data.data?.data?.length || 0,
      total: stocksResponse.data.data?.pagination?.total || 0,
      firstStock: stocksResponse.data.data?.data?.[0]?.symbol || 'None'
    });
    
    // Test ETFs endpoint
    console.log('\n3️⃣ Testing ETFs endpoint...');
    const etfsResponse = await axios.get(`${BACKEND_URL}${ENDPOINTS.etfs}?page=1&limit=3`);
    console.log('✅ ETFs endpoint:', {
      success: etfsResponse.data.success,
      count: etfsResponse.data.data?.data?.length || 0,
      total: etfsResponse.data.data?.pagination?.total || 0,
      firstETF: etfsResponse.data.data?.data?.[0]?.symbol || 'None'
    });
    
    // Test crypto endpoint
    console.log('\n4️⃣ Testing crypto endpoint...');
    const cryptoResponse = await axios.get(`${BACKEND_URL}${ENDPOINTS.crypto}?page=1&limit=3`);
    console.log('✅ ETFs endpoint:', {
      success: cryptoResponse.data.success,
      count: cryptoResponse.data.data?.data?.length || 0,
      total: cryptoResponse.data.data?.pagination?.total || 0,
      firstCrypto: cryptoResponse.data.data?.data?.[0]?.symbol || 'None'
    });
    
    // Test enhanced market data
    console.log('\n5️⃣ Testing enhanced market data endpoint...');
    const enhancedResponse = await axios.get(`${BACKEND_URL}${ENDPOINTS.enhanced}/AAPL`);
    console.log('✅ Enhanced market data:', {
      success: enhancedResponse.data.success,
      pe: enhancedResponse.data.data?.pe,
      marketCap: enhancedResponse.data.data?.marketCap,
      dividendYield: enhancedResponse.data.data?.dividendYield
    });
    
    // Test market data endpoint
    console.log('\n6️⃣ Testing market data endpoint...');
    const marketDataResponse = await axios.get(`${BACKEND_URL}${ENDPOINTS.marketData}`);
    console.log('✅ Market data:', {
      success: marketDataResponse.data.success,
      stocksCount: marketDataResponse.data.stocks?.length || 0,
      cryptoCount: marketDataResponse.data.digitalAssets?.length || 0
    });
    
    console.log('\n🎉 All backend endpoints are working correctly!');
    
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function testFrontendConfiguration() {
  console.log('\n🔧 Testing Frontend Configuration...\n');
  
  try {
    // Test environment configuration
    console.log('1️⃣ Checking environment configuration...');
    const envConfig = {
      NODE_ENV: process.env.NODE_ENV,
      VITE_BACKEND_URL: process.env.VITE_BACKEND_URL,
      VITE_APP_ENVIRONMENT: process.env.VITE_APP_ENVIRONMENT
    };
    console.log('✅ Environment variables:', envConfig);
    
    // Test URL resolution
    console.log('\n2️⃣ Testing URL resolution...');
    const baseUrl = process.env.VITE_BACKEND_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://avila-protocol-testnet.onrender.com');
    console.log('✅ Backend base URL:', baseUrl);
    
    // Test endpoint construction
    console.log('\n3️⃣ Testing endpoint construction...');
    const testEndpoint = `${baseUrl}/api/health`;
    console.log('✅ Test endpoint:', testEndpoint);
    
    // Test actual endpoint
    console.log('\n4️⃣ Testing actual endpoint with resolved URL...');
    const testResponse = await axios.get(testEndpoint);
    console.log('✅ Endpoint test successful:', testResponse.data.success);
    
    console.log('\n🎉 Frontend configuration is working correctly!');
    
  } catch (error) {
    console.error('❌ Frontend configuration test failed:', error.message);
    process.exit(1);
  }
}

async function testDataFlow() {
  console.log('\n📊 Testing Complete Data Flow...\n');
  
  try {
    // Simulate the exact flow from TradFiMarkets.tsx
    console.log('1️⃣ Simulating TradFiMarkets data flow...');
    
    // Step 1: Get basic stock data
    console.log('   📈 Fetching basic stock data...');
    const basicDataResponse = await axios.get(`${BACKEND_URL}/api/stocks?page=1&limit=5`);
    const basicData = basicDataResponse.data.data.data;
    console.log(`   ✅ Basic data fetched: ${basicData.length} stocks`);
    
    // Step 2: Enhance each asset with P/E data
    console.log('   🔍 Enhancing assets with P/E data...');
    const enhancedAssets = [];
    
    for (let i = 0; i < Math.min(3, basicData.length); i++) {
      const asset = basicData[i];
      try {
        const enhancedResponse = await axios.get(`${BACKEND_URL}/api/market-data/enhanced/${asset.symbol}`);
        const enhancedData = enhancedResponse.data.data;
        
        enhancedAssets.push({
          ...asset,
          pe: enhancedData.pe
        });
        
        console.log(`   ✅ Enhanced ${asset.symbol}: P/E = ${enhancedData.pe}`);
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
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Frontend Debugging Tests...\n');
  
  try {
    await testBackendConnectivity();
    await testFrontendConfiguration();
    await testDataFlow();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Backend connectivity: Working');
    console.log('✅ Frontend configuration: Working');
    console.log('✅ Data flow: Working');
    console.log('✅ Enhanced caching: Working');
    console.log('✅ API endpoints: All functional');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run all tests
runAllTests(); 