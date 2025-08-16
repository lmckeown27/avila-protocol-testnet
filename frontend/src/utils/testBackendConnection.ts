import { config } from '../config/environment';

export async function testBackendConnection() {
  try {
    const backendURL = `${config.backend.baseUrl}${config.backend.endpoints.health}`;
    // Replace with any reliable test endpoint in your backend
    const response = await fetch(backendURL, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Backend reachable:", data);
    return data;
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
    throw error;
  }
}

// Additional test functions for different endpoints
export async function testMarketDataEndpoint() {
  try {
    const backendURL = `${config.backend.baseUrl}${config.backend.endpoints.marketData}`;
    const response = await fetch(backendURL, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Market data endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Market data endpoint reachable:", data);
    return data;
  } catch (error) {
    console.error("❌ Market data endpoint connection failed:", error);
    throw error;
  }
}

export async function testTradFiEndpoint() {
  try {
    const backendURL = `${config.backend.baseUrl}${config.backend.endpoints.stocks}`;
    const response = await fetch(backendURL, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`TradFi endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ TradFi endpoint reachable:", data);
    return data;
  } catch (error) {
    console.error("❌ TradFi endpoint connection failed:", error);
    throw error;
  }
}

export async function testDeFiEndpoint() {
  try {
    const backendURL = `${config.backend.baseUrl}${config.backend.endpoints.digitalAssets}`;
    const response = await fetch(backendURL, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`DeFi endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ DeFi endpoint reachable:", data);
    return data;
  } catch (error) {
    console.error("❌ DeFi endpoint connection failed:", error);
    throw error;
  }
}

// Browser-friendly test function for debugging
export async function testBackendFromBrowser() {
  console.log('🧪 Testing backend connection from browser...');
  console.log('📍 Backend URL:', config.backend.baseUrl);
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${config.backend.baseUrl}/api/health`);
    console.log('🏥 Health check status:', healthResponse.status, healthResponse.statusText);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check successful:', healthData);
    } else {
      console.error('❌ Health check failed:', healthResponse.status);
    }
    
    // Test stock market endpoint
    const stockResponse = await fetch(`${config.backend.baseUrl}/api/market-data/stock-market`);
    console.log('📈 Stock market status:', stockResponse.status, stockResponse.statusText);
    
    if (stockResponse.ok) {
      const stockData = await stockResponse.json();
      console.log('✅ Stock market data received:', stockData);
    } else {
      console.error('❌ Stock market failed:', stockResponse.status);
    }
    
    return true;
  } catch (error) {
    console.error('💥 Browser test failed:', error);
    return false;
  }
}

// Comprehensive test function
export async function runAllBackendTests() {
  console.log("🚀 Starting backend connectivity tests...");
  
  try {
    // Test health endpoint
    await testBackendConnection();
    
    // Test market data endpoints
    await testMarketDataEndpoint();
    await testTradFiEndpoint();
    await testDeFiEndpoint();
    
    console.log("🎉 All backend tests completed successfully!");
    return true;
  } catch (error) {
    console.error("💥 Some backend tests failed:", error);
    return false;
  }
} 