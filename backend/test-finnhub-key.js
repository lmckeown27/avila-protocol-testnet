#!/usr/bin/env node

/**
 * Finnhub API Key Diagnostic Script
 * Tests the API key thoroughly to identify the exact issue
 */

const axios = require('axios');

const FINNHUB_API_KEY = 'd2ehcv9r01qlu2qur8rgd2ehcv9r01qlu2qur8s0';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

async function testFinnhubKey() {
  console.log('🔍 Finnhub API Key Diagnostic Test\n');
  console.log(`API Key: ${FINNHUB_API_KEY}`);
  console.log(`Key Length: ${FINNHUB_API_KEY.length} characters\n`);
  
  // Test 1: Basic quote endpoint
  console.log('🧪 Test 1: Basic Quote Endpoint');
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: { 
        symbol: 'AAPL',
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    console.log('  ✅ Success! Status:', response.status);
    console.log('  📊 Data:', response.data);
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    if (error.response) {
      console.log('  📡 Status:', error.response.status);
      console.log('  📝 Response:', error.response.data);
    }
  }
  
  // Test 2: Company profile endpoint
  console.log('\n🧪 Test 2: Company Profile Endpoint');
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/company/profile2`, {
      params: { 
        symbol: 'AAPL',
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    console.log('  ✅ Success! Status:', response.status);
    console.log('  📊 Data received:', !!response.data);
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    if (error.response) {
      console.log('  📡 Status:', error.response.status);
      console.log('  📝 Response:', error.response.data);
    }
  }
  
  // Test 3: Market news endpoint
  console.log('\n🧪 Test 3: Market News Endpoint');
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/news`, {
      params: { 
        category: 'general',
        token: FINNHUB_API_KEY
      },
      timeout: 10000
    });
    console.log('  ✅ Success! Status:', response.status);
    console.log('  📊 Articles received:', response.data?.length || 0);
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    if (error.response) {
      console.log('  📡 Status:', error.response.status);
      console.log('  📝 Response:', error.response.data);
    }
  }
  
  // Test 4: Check if key is being sent correctly
  console.log('\n🧪 Test 4: Key Parameter Check');
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: { 
        symbol: 'AAPL'
        // Intentionally omitting token to see if it's a parameter issue
      },
      timeout: 10000
    });
    console.log('  ✅ Success without token (unexpected):', response.status);
  } catch (error) {
    console.log('  ❌ Failed as expected:', error.message);
    if (error.response) {
      console.log('  📡 Status:', error.response.status);
      console.log('  📝 Response:', error.response.data);
    }
  }
  
  // Test 5: Try with different token parameter names
  console.log('\n🧪 Test 5: Alternative Token Parameter Names');
  const alternativeNames = ['apikey', 'api_key', 'key', 'auth'];
  
  for (const paramName of alternativeNames) {
    try {
      const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
        params: { 
          symbol: 'AAPL',
          [paramName]: FINNHUB_API_KEY
        },
        timeout: 5000
      });
      console.log(`  ✅ Success with '${paramName}':`, response.status);
      break;
    } catch (error) {
      console.log(`  ❌ Failed with '${paramName}':`, error.response?.status || error.message);
    }
  }
  
  // Summary and recommendations
  console.log('\n📋 Diagnostic Summary');
  console.log('=====================');
  console.log('• API Key Length:', FINNHUB_API_KEY.length, 'characters');
  console.log('• Expected Length: Usually 20+ characters for Finnhub');
  console.log('• Key Format: Should be alphanumeric');
  
  console.log('\n💡 Recommendations:');
  console.log('1. Verify the API key in your Finnhub dashboard');
  console.log('2. Check if the key is still active/valid');
  console.log('3. Ensure the key has the necessary permissions');
  console.log('4. Consider regenerating the key if needed');
  console.log('5. Check your Finnhub account status and billing');
  
  console.log('\n🔗 Next Steps:');
  console.log('• Visit: https://finnhub.io/account');
  console.log('• Check API key status and permissions');
  console.log('• Verify account is not suspended');
}

// Run the diagnostic
testFinnhubKey().catch(console.error); 