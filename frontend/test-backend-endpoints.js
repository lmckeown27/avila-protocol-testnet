// Test script to verify backend endpoints
const BACKEND_URL = 'https://avila-protocol-testnet.onrender.com';

async function testEndpoint(endpoint, name) {
  try {
    console.log(`🧪 Testing ${name} endpoint: ${endpoint}`);
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${name} endpoint successful:`);
    console.log(`   Status: ${data.success}`);
    console.log(`   Has data: ${!!data.data}`);
    console.log(`   Data type: ${Array.isArray(data.data) ? 'Array' : typeof data.data}`);
    console.log(`   Data length: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log(`   Sample item:`, data.data[0]);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ ${name} endpoint failed:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting backend endpoint tests...\n');
  
  const endpoints = [
    { url: `${BACKEND_URL}/api/health`, name: 'Health' },
    { url: `${BACKEND_URL}/api/stocks`, name: 'Stocks' },
    { url: `${BACKEND_URL}/api/etfs`, name: 'ETFs' },
    { url: `${BACKEND_URL}/api/crypto`, name: 'Crypto' },
    { url: `${BACKEND_URL}/api/market-data`, name: 'Market Data' }
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.url, endpoint.name);
    console.log(''); // Add spacing between tests
  }
  
  console.log('🎉 Backend endpoint tests completed!');
}

// Make test function available in browser
if (typeof window !== 'undefined') {
  window.testBackendEndpoints = runTests;
  console.log('🔧 Test function available: testBackendEndpoints()');
  
  // Auto-run tests in browser
  runTests();
} else {
  console.log('🌐 This script is designed to run in a browser environment');
  console.log('🔧 Open the frontend and check the console for testBackendEndpoints()');
} 