const { AptosClient, AptosAccount, CoinClient, TokenClient } = require("aptos");
const fs = require("fs");
const path = require("path");

// Configuration
const NODE_URL = "https://fullnode.testnet.aptoslabs.com";
const PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY || "0x..."; // Set your private key
const MODULE_NAME = "avila_protocol";

class AvilaProtocolDeployer {
    constructor() {
        this.client = new AptosClient(NODE_URL);
        this.account = new AptosAccount(PRIVATE_KEY);
        this.coinClient = new CoinClient(this.client);
        this.tokenClient = new TokenClient(this.client);
    }

    async deploy() {
        console.log("🚀 Starting Avila Protocol deployment...");
        console.log(`📡 Network: ${NODE_URL}`);
        console.log(`👤 Deployer: ${this.account.address()}`);

        try {
            // Check account balance
            const balance = await this.coinClient.checkBalance(this.account);
            console.log(`💰 Account balance: ${balance} APT`);

            if (balance < 0.1) {
                throw new Error("Insufficient balance. Need at least 0.1 APT for deployment.");
            }

            // Deploy contracts
            await this.deployContracts();

            console.log("✅ Deployment completed successfully!");
            console.log(`📋 Contract address: ${this.account.address()}`);
            console.log(`🔗 Explorer: https://explorer.aptoslabs.com/account/${this.account.address()}?network=testnet`);

        } catch (error) {
            console.error("❌ Deployment failed:", error);
            throw error;
        }
    }

    async deployContracts() {
        console.log("\n📦 Deploying contracts...");

        // Read Move modules
        const modules = [
            "oracle.move",
            "option_token.move", 
            "vault.move",
            "settlement.move",
            "factory.move"
        ];

        const modulePaths = modules.map(module => 
            path.join(__dirname, "..", "contracts", module)
        );

        // Compile and deploy
        const payload = {
            type: "module_bundle_payload",
            modules: modulePaths.map(modulePath => {
                const moduleCode = fs.readFileSync(modulePath, "utf8");
                return {
                    bytecode: `0x${Buffer.from(moduleCode, "utf8").toString("hex")}`
                };
            })
        };

        const txnRequest = await this.client.generateTransaction(
            this.account.address(),
            payload,
            { max_gas_amount: "2000000" }
        );

        const signedTxn = await this.client.signTransaction(this.account, txnRequest);
        const txnResult = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(txnResult.hash);

        console.log(`✅ Contracts deployed in transaction: ${txnResult.hash}`);
    }

    async initializeContracts() {
        console.log("\n🔧 Initializing contracts...");

        // Initialize Oracle
        await this.initializeOracle();
        
        // Initialize Factory
        await this.initializeFactory();
        
        // Initialize Vault
        await this.initializeVault();
        
        // Initialize Settlement
        await this.initializeSettlement();

        console.log("✅ Contract initialization completed!");
    }

    async initializeOracle() {
        console.log("📊 Initializing Oracle...");
        
        const payload = {
            type: "entry_function_payload",
            function: `${this.account.address()}::oracle::initialize`,
            type_arguments: [],
            arguments: []
        };

        await this.executeTransaction(payload);
    }

    async initializeFactory() {
        console.log("🏭 Initializing Factory...");
        
        const payload = {
            type: "entry_function_payload",
            function: `${this.account.address()}::factory::initialize`,
            type_arguments: [],
            arguments: []
        };

        await this.executeTransaction(payload);
    }

    async initializeVault() {
        console.log("🏦 Initializing Vault...");
        
        // Use APT as collateral coin
        const aptCoinType = "0x1::aptos_coin::AptosCoin";
        
        const payload = {
            type: "entry_function_payload",
            function: `${this.account.address()}::vault::initialize`,
            type_arguments: [],
            arguments: [aptCoinType]
        };

        await this.executeTransaction(payload);
    }

    async initializeSettlement() {
        console.log("⚖️ Initializing Settlement...");
        
        const payload = {
            type: "entry_function_payload",
            function: `${this.account.address()}::settlement::initialize`,
            type_arguments: [],
            arguments: []
        };

        await this.executeTransaction(payload);
    }

    async executeTransaction(payload) {
        const txnRequest = await this.client.generateTransaction(
            this.account.address(),
            payload,
            { max_gas_amount: "2000000" }
        );

        const signedTxn = await this.client.signTransaction(this.account, txnRequest);
        const txnResult = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(txnResult.hash);
        
        console.log(`✅ Transaction executed: ${txnResult.hash}`);
    }

    async verifyDeployment() {
        console.log("\n🔍 Verifying deployment...");

        try {
            // Check if modules exist
            const modules = [
                "oracle",
                "option_token",
                "vault", 
                "settlement",
                "factory"
            ];

            for (const module of modules) {
                const moduleData = await this.client.getAccountModule(
                    this.account.address(),
                    module
                );
                console.log(`✅ ${module} module verified`);
            }

            console.log("✅ All modules verified successfully!");

        } catch (error) {
            console.error("❌ Verification failed:", error);
            throw error;
        }
    }
}

// CLI interface
async function main() {
    const deployer = new AvilaProtocolDeployer();
    
    const command = process.argv[2];
    
    switch (command) {
        case "deploy":
            await deployer.deploy();
            break;
        case "initialize":
            await deployer.initializeContracts();
            break;
        case "verify":
            await deployer.verifyDeployment();
            break;
        case "full":
            await deployer.deploy();
            await deployer.initializeContracts();
            await deployer.verifyDeployment();
            break;
        default:
            console.log("Usage: node deploy.js [deploy|initialize|verify|full]");
            console.log("  deploy    - Deploy contracts");
            console.log("  initialize - Initialize deployed contracts");
            console.log("  verify    - Verify deployment");
            console.log("  full      - Deploy, initialize, and verify");
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AvilaProtocolDeployer }; 