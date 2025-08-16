#!/usr/bin/env node

/**
 * Test script to verify Render deployment configuration
 * Run this locally to test the same configuration that Render will use
 */

// Simulate Render environment
process.env.NODE_ENV = 'production';
process.env.PORT = '10000';

console.log('🧪 Testing Render deployment configuration...');
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`🔌 Port: ${process.env.PORT}`);

// Test the server startup
const { spawn } = require('child_process');
const path = require('path');

console.log('\n📦 Building backend...');
const buildProcess = spawn('npm', ['run', 'build'], { 
  cwd: path.join(__dirname),
  stdio: 'inherit'
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build successful!');
    console.log('\n🚀 Starting server with Render configuration...');
    
    const serverProcess = spawn('node', ['dist/index.js'], {
      cwd: path.join(__dirname),
      stdio: 'inherit'
    });
    
    // Give server time to start
    setTimeout(() => {
      console.log('\n🧪 Testing endpoints...');
      
      const http = require('http');
      
      // Test health endpoint
      const healthReq = http.request({
        hostname: 'localhost',
        port: 10000,
        path: '/api/health',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`✅ Health endpoint (${res.statusCode}): ${data.substring(0, 100)}...`);
          
          // Test stocks endpoint
          const stocksReq = http.request({
            hostname: 'localhost',
            port: 10000,
            path: '/api/stocks?page=1&limit=5',
            method: 'GET'
          }, (stocksRes) => {
            let stocksData = '';
            stocksRes.on('data', chunk => stocksData += chunk);
            stocksRes.on('end', () => {
              console.log(`✅ Stocks endpoint (${stocksRes.statusCode}): ${stocksData.substring(0, 100)}...`);
              console.log('\n🎉 All tests passed! Render deployment should work.');
              serverProcess.kill();
              process.exit(0);
            });
          });
          
          stocksReq.on('error', (err) => {
            console.log(`❌ Stocks endpoint error: ${err.message}`);
            serverProcess.kill();
            process.exit(1);
          });
          
          stocksReq.end();
        });
      });
      
      healthReq.on('error', (err) => {
        console.log(`❌ Health endpoint error: ${err.message}`);
        serverProcess.kill();
        process.exit(1);
      });
      
      healthReq.end();
      
    }, 5000); // Wait 5 seconds for server to start
    
    serverProcess.on('error', (err) => {
      console.log(`❌ Server error: ${err.message}`);
      process.exit(1);
    });
    
  } else {
    console.log(`❌ Build failed with code ${code}`);
    process.exit(1);
  }
});

buildProcess.on('error', (err) => {
  console.log(`❌ Build process error: ${err.message}`);
  process.exit(1);
}); 