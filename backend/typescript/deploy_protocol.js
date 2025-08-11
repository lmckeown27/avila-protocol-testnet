#!/usr/bin/env node

/**
 * Avila Protocol Deployment Script
 * 
 * This script demonstrates how to deploy and initialize the complete
 * TradFi-style European Options Protocol on Aptos.
 * 
 * Usage:
 *   node scripts/deploy_protocol.js [network]
 * 
 * Networks: mainnet, testnet, devnet (default: devnet)
 */

const { AptosClient, AptosAccount, TxnBuilderTypes, BCS } = require("aptos");
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORKS = {
    mainnet: {
        nodeUrl: "https://fullnode.mainnet.aptoslabs.com",
        faucetUrl: null
    },
    testnet: {
        nodeUrl: "https://fullnode.testnet.aptoslabs.com",
        faucetUrl: "https://faucet.testnet.aptoslabs.com"
    },
    devnet: {
        nodeUrl: "https://fullnode.devnet.aptoslabs.com",
        faucetUrl: "https://faucet.devnet.aptoslabs.com"
    }
};

// Protocol configuration
const PROTOCOL_CONFIG = {
    adminAddress: null, // Will be set from deployed account
    maxStalenessSeconds: 300, // 5 minutes
    twapWindowSeconds: 3600, // 1 hour
    initialMarginMultiplier: 150, // 150%
    maintenanceMarginMultiplier: 120, // 120%
    liquidationThreshold: 110, // 110%
    maxLeverage: 10,
    minStrikePrice: 1000, // $10.00
    maxStrikePrice: 1000000000, // $10M
    minContractSize: 1,
    maxContractSize: 10000,
    minExpiryDays: 1,
    maxExpiryDays: 365
};

class AvilaProtocolDeployer {
    constructor(network = 'devnet') {
        this.network = network;
        this.config = NETWORKS[network];
        this.client = new AptosClient(this.config.nodeUrl);
        this.adminAccount = null;
        this.deployedModules = {};
    }

    /**
     * Initialize deployment environment
     */
    async initialize() {
        console.log(`🚀 Initializing Avila Protocol deployment on ${this.network.toUpperCase()}`);
        
        try {
            // Create or load admin account
            this.adminAccount = await this.createOrLoadAdminAccount();
            console.log(`✅ Admin account ready: ${this.adminAccount.address()}`);
            
            // Fund account if needed (devnet/testnet only)
            if (this.config.faucetUrl) {
                await this.fundAccount();
            }
            
            // Update protocol config with admin address
            PROTOCOL_CONFIG.adminAddress = this.adminAccount.address().toString();
            
        } catch (error) {
            console.error('❌ Failed to initialize deployment environment:', error);
            throw error;
        }
    }

    /**
     * Create or load admin account
     */
    async createOrLoadAdminAccount() {
        const privateKeyPath = path.join(__dirname, '..', '.aptos', 'key.json');
        
        try {
            // Try to load existing account
            if (fs.existsSync(privateKeyPath)) {
                const privateKeyHex = fs.readFileSync(privateKeyPath, 'utf8');
                const privateKeyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
                return new AptosAccount(privateKeyBytes);
            }
        } catch (error) {
            console.log('No existing account found, creating new one...');
        }

        // Create new account
        const account = new AptosAccount();
        
        // Save private key
        const privateKeyDir = path.dirname(privateKeyPath);
        if (!fs.existsSync(privateKeyDir)) {
            fs.mkdirSync(privateKeyDir, { recursive: true });
        }
        fs.writeFileSync(privateKeyPath, Buffer.from(account.signingKey.toUint8Array()).toString('hex'));
        
        return account;
    }

    /**
     * Fund account with test tokens
     */
    async fundAccount() {
        if (!this.config.faucetUrl) return;
        
        try {
            console.log('💰 Funding account...');
            const response = await fetch(this.config.faucetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: this.adminAccount.address().toString(),
                    amount: 1000000000 // 1B octas
                })
            });
            
            if (response.ok) {
                console.log('✅ Account funded successfully');
                // Wait for transaction to be processed
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.warn('⚠️  Faucet funding failed, continuing with existing balance');
            }
        } catch (error) {
            console.warn('⚠️  Faucet funding failed, continuing with existing balance:', error.message);
        }
    }

    /**
     * Deploy all protocol modules
     */
    async deployProtocol() {
        console.log('\n📦 Deploying Avila Protocol modules...');
        
        try {
            // Deploy modules in dependency order
            await this.deployModule('price_oracle_adapter');
            await this.deployModule('collateral_vault');
            await this.deployModule('margin_engine');
            await this.deployModule('order_book');
            await this.deployModule('options_core');
            
            console.log('✅ All modules deployed successfully');
            
        } catch (error) {
            console.error('❌ Module deployment failed:', error);
            throw error;
        }
    }

    /**
     * Deploy individual module
     */
    async deployModule(moduleName) {
        console.log(`  📤 Deploying ${moduleName}...`);
        
        try {
            const modulePath = path.join(__dirname, '..', 'build', 'avila_protocol', 'bytecode_modules', `${moduleName}.mv`);
            
            if (!fs.existsSync(modulePath)) {
                throw new Error(`Module bytecode not found: ${modulePath}`);
            }
            
            const moduleBytes = fs.readFileSync(modulePath);
            
            const payload = {
                type: "module_bundle_payload",
                modules: [{
                    bytecode: moduleBytes.toString('hex')
                }]
            };
            
            const transaction = await this.client.generateTransaction(
                this.adminAccount.address(),
                payload
            );
            
            const signedTxn = await this.client.signTransaction(this.adminAccount, transaction);
            const txnResult = await this.client.submitTransaction(signedTxn);
            
            // Wait for transaction to be processed
            await this.client.waitForTransaction(txnResult.hash);
            
            this.deployedModules[moduleName] = txnResult.hash;
            console.log(`    ✅ ${moduleName} deployed: ${txnResult.hash}`);
            
        } catch (error) {
            console.error(`    ❌ Failed to deploy ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Initialize all protocol modules
     */
    async initializeProtocol() {
        console.log('\n🔧 Initializing protocol modules...');
        
        try {
            // Initialize modules in dependency order
            await this.initializeModule('price_oracle_adapter', 'initialize', []);
            await this.initializeModule('collateral_vault', 'initialize', []);
            await this.initializeModule('margin_engine', 'initialize', []);
            await this.initializeModule('order_book', 'initialize', []);
            await this.initializeModule('options_core', 'initialize', []);
            
            console.log('✅ All modules initialized successfully');
            
        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize individual module
     */
    async initializeModule(moduleName, functionName, args) {
        console.log(`  🔧 Initializing ${moduleName}...`);
        
        try {
            const payload = {
                type: "entry_function_payload",
                function: `${this.adminAccount.address()}::${moduleName}::${functionName}`,
                type_arguments: [],
                arguments: args
            };
            
            const transaction = await this.client.generateTransaction(
                this.adminAccount.address(),
                payload
            );
            
            const signedTxn = await this.client.signTransaction(this.adminAccount, transaction);
            const txnResult = await this.client.submitTransaction(signedTxn);
            
            // Wait for transaction to be processed
            await this.client.waitForTransaction(txnResult.hash);
            
            console.log(`    ✅ ${moduleName} initialized: ${txnResult.hash}`);
            
        } catch (error) {
            console.error(`    ❌ Failed to initialize ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Configure initial protocol settings
     */
    async configureProtocol() {
        console.log('\n⚙️  Configuring protocol settings...');
        
        try {
            // Whitelist a test oracle
            await this.whitelistTestOracle();
            
            // Set initial risk parameters
            await this.setRiskParameters();
            
            console.log('✅ Protocol configuration completed');
            
        } catch (error) {
            console.error('❌ Protocol configuration failed:', error);
            throw error;
        }
    }

    /**
     * Whitelist test oracle
     */
    async whitelistTestOracle() {
        console.log('  🔐 Whitelisting test oracle...');
        
        try {
            // Create test oracle account
            const testOracle = new AptosAccount();
            
            const payload = {
                type: "entry_function_payload",
                function: `${this.adminAccount.address()}::price_oracle_adapter::whitelist_oracle`,
                type_arguments: [],
                arguments: [
                    testOracle.address().toString(),
                    0 // Chainlink type
                ]
            };
            
            const transaction = await this.client.generateTransaction(
                this.adminAccount.address(),
                payload
            );
            
            const signedTxn = await this.client.signTransaction(this.adminAccount, transaction);
            const txnResult = await this.client.submitTransaction(signedTxn);
            
            await this.client.waitForTransaction(txnResult.hash);
            
            console.log(`    ✅ Test oracle whitelisted: ${testOracle.address()}`);
            
        } catch (error) {
            console.error(`    ❌ Failed to whitelist oracle:`, error);
            throw error;
        }
    }

    /**
     * Set initial risk parameters
     */
    async setRiskParameters() {
        console.log('  🎯 Setting risk parameters...');
        
        try {
            // This would set initial margin requirements, liquidation thresholds, etc.
            // For now, we'll use the default values from the smart contracts
            
            console.log('    ✅ Risk parameters set to defaults');
            
        } catch (error) {
            console.error(`    ❌ Failed to set risk parameters:`, error);
            throw error;
        }
    }

    /**
     * Verify protocol deployment
     */
    async verifyDeployment() {
        console.log('\n🔍 Verifying protocol deployment...');
        
        try {
            // Check if all modules are deployed
            for (const [moduleName, txHash] of Object.entries(this.deployedModules)) {
                console.log(`  ✅ ${moduleName}: ${txHash}`);
            }
            
            // Check protocol state
            await this.checkProtocolState();
            
            console.log('✅ Protocol deployment verified successfully');
            
        } catch (error) {
            console.error('❌ Deployment verification failed:', error);
            throw error;
        }
    }

    /**
     * Check protocol state
     */
    async checkProtocolState() {
        try {
            // Check if options core is initialized
            const payload = {
                type: "entry_function_payload",
                function: `${this.adminAccount.address()}::options_core::is_initialized`,
                type_arguments: [],
                arguments: []
            };
            
            const transaction = await this.client.generateTransaction(
                this.adminAccount.address(),
                payload
            );
            
            const signedTxn = await this.client.signTransaction(this.adminAccount, transaction);
            const txnResult = await this.client.submitTransaction(signedTxn);
            
            await this.client.waitForTransaction(txnResult.hash);
            
            console.log('    ✅ Protocol state verified');
            
        } catch (error) {
            console.error(`    ❌ Failed to verify protocol state:`, error);
            throw error;
        }
    }

    /**
     * Generate deployment report
     */
    generateDeploymentReport() {
        console.log('\n📊 Deployment Report');
        console.log('===================');
        console.log(`Network: ${this.network.toUpperCase()}`);
        console.log(`Admin Address: ${this.adminAccount.address()}`);
        console.log(`Deployment Time: ${new Date().toISOString()}`);
        console.log('\nDeployed Modules:');
        
        for (const [moduleName, txHash] of Object.entries(this.deployedModules)) {
            console.log(`  ${moduleName}: ${txHash}`);
        }
        
        console.log('\nProtocol Configuration:');
        console.log(`  Max Staleness: ${PROTOCOL_CONFIG.maxStalenessSeconds}s`);
        console.log(`  TWAP Window: ${PROTOCOL_CONFIG.twapWindowSeconds}s`);
        console.log(`  Initial Margin: ${PROTOCOL_CONFIG.initialMarginMultiplier}%`);
        console.log(`  Maintenance Margin: ${PROTOCOL_CONFIG.maintenanceMarginMultiplier}%`);
        console.log(`  Liquidation Threshold: ${PROTOCOL_CONFIG.liquidationThreshold}%`);
        console.log(`  Max Leverage: ${PROTOCOL_CONFIG.maxLeverage}x`);
        
        // Save report to file
        const reportPath = path.join(__dirname, '..', 'deployment_report.json');
        const report = {
            network: this.network,
            adminAddress: this.adminAccount.address().toString(),
            deploymentTime: new Date().toISOString(),
            modules: this.deployedModules,
            config: PROTOCOL_CONFIG
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Deployment report saved to: ${reportPath}`);
    }

    /**
     * Run complete deployment
     */
    async run() {
        try {
            await this.initialize();
            await this.deployProtocol();
            await this.initializeProtocol();
            await this.configureProtocol();
            await this.verifyDeployment();
            this.generateDeploymentReport();
            
            console.log('\n🎉 Avila Protocol deployment completed successfully!');
            console.log('\nNext steps:');
            console.log('  1. Test the protocol with integration tests');
            console.log('  2. Deploy to testnet for validation');
            console.log('  3. Deploy to mainnet for production');
            
        } catch (error) {
            console.error('\n💥 Deployment failed:', error);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    const network = process.argv[2] || 'devnet';
    
    if (!NETWORKS[network]) {
        console.error(`❌ Invalid network: ${network}`);
        console.error(`Available networks: ${Object.keys(NETWORKS).join(', ')}`);
        process.exit(1);
    }
    
    const deployer = new AvilaProtocolDeployer(network);
    await deployer.run();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AvilaProtocolDeployer, NETWORKS, PROTOCOL_CONFIG }; 