# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Avila Protocol contracts to Aptos testnet and mainnet.

## Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
2. **Aptos CLI** (latest version)
3. **Git** (for version control)

### Required Accounts

1. **Aptos Account** with sufficient APT for deployment
2. **Private Key** for transaction signing
3. **Testnet APT** for testing (get from faucet)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/avila-protocol/avila-contracts.git
cd avila-contracts
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Aptos CLI

```bash
# Initialize Aptos CLI
aptos init

# Configure for testnet
aptos node set-default --node-type testnet

# Check configuration
aptos node list
```

### 4. Set Environment Variables

```bash
# Set your private key
export APTOS_PRIVATE_KEY="0x..."

# Or create .env file
echo "APTOS_PRIVATE_KEY=0x..." > .env
```

## Testing

### Run Unit Tests

```bash
# Run all tests
npm test

# Run specific test module
aptos move test --filter oracle_tests

# Run integration tests
aptos move test --filter integration_tests
```

### Run Integration Tests

```bash
# Run full test suite
aptos move test

# Check test coverage
aptos move test --coverage
```

## Deployment to Testnet

### 1. Verify Account Balance

```bash
# Check account balance
aptos account list --query balance

# Ensure you have at least 0.1 APT for deployment
```

### 2. Compile Contracts

```bash
# Compile all modules
aptos move compile

# Verify compilation
aptos move check
```

### 3. Deploy Contracts

```bash
# Deploy to testnet
npm run deploy:testnet

# Or use the deployment script directly
node scripts/deploy.js full
```

### 4. Verify Deployment

```bash
# Verify deployment
npm run verify

# Check contract address
echo "Contract deployed at: $(aptos account list --query sequence_number)"
```

### 5. Initialize Contracts

```bash
# Initialize all contracts
npm run initialize

# Or initialize individually
node scripts/deploy.js initialize
```

## Deployment to Mainnet

### 1. Security Checklist

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Code review approved
- [ ] Emergency procedures documented
- [ ] Monitoring systems configured

### 2. Deploy to Mainnet

```bash
# Deploy to mainnet
npm run deploy:mainnet

# Verify mainnet deployment
npm run verify
```

### 3. Post-Deployment Verification

```bash
# Verify all modules deployed
aptos account list --query modules

# Check initialization
aptos account list --query resources
```

## Configuration

### Oracle Configuration

```bash
# Add price updaters
aptos move run --function-id <contract_address>::oracle::add_updater \
  --args address:<updater_address>

# Update oracle parameters
aptos move run --function-id <contract_address>::oracle::update_price \
  --args address:<asset_address> u64:<price> u8:<decimals>
```

### Factory Configuration

```bash
# Add option creators
aptos move run --function-id <contract_address>::factory::add_option_creator \
  --args address:<creator_address>

# Update factory parameters
aptos move run --function-id <contract_address>::factory::update_factory_params \
  --args u64:<min_strike> u64:<max_strike> u64:<min_exp_days> u64:<max_exp_days>
```

### Vault Configuration

```bash
# Initialize vault with collateral coin
aptos move run --function-id <contract_address>::vault::initialize \
  --args address:<collateral_coin_address>
```

### Settlement Configuration

```bash
# Update settlement fee
aptos move run --function-id <contract_address>::settlement::update_settlement_fee \
  --args u64:<new_fee>

# Update minimum settlement amount
aptos move run --function-id <contract_address>::settlement::update_min_settlement_amount \
  --args u64:<new_amount>
```

## Monitoring

### 1. Event Monitoring

```bash
# Monitor events
aptos account list --query events

# Filter specific events
aptos account list --query events --filter "OptionCreatedEvent"
```

### 2. Performance Monitoring

```bash
# Check gas usage
aptos account list --query gas_used

# Monitor transaction success rates
aptos account list --query sequence_number
```

### 3. Health Checks

```bash
# Verify oracle prices
aptos move run --function-id <contract_address>::oracle::get_price \
  --args address:<asset_address>

# Check vault statistics
aptos move run --function-id <contract_address>::vault::get_vault_total_collateral
```

## Troubleshooting

### Common Issues

#### 1. Insufficient Balance

```bash
# Check balance
aptos account list --query balance

# Get testnet APT from faucet
curl -X POST https://faucet.testnet.aptoslabs.com/mint \
  -H "Content-Type: application/json" \
  -d '{"address":"<your_address>","amount":100000000}'
```

#### 2. Compilation Errors

```bash
# Clean build
aptos move clean

# Recompile
aptos move compile

# Check for syntax errors
aptos move check
```

#### 3. Deployment Failures

```bash
# Check transaction status
aptos account list --query sequence_number

# View transaction details
aptos transaction show --hash <transaction_hash>
```

#### 4. Module Not Found

```bash
# Verify module deployment
aptos account list --query modules

# Check module bytecode
aptos account list --query modules --filter "oracle"
```

### Debug Commands

```bash
# Enable debug logging
export APTOS_DEBUG=true

# Run with verbose output
aptos move test --verbose

# Check Move.toml configuration
cat Move.toml
```

## Security Considerations

### 1. Private Key Management

- Use hardware wallets for mainnet
- Never commit private keys to repository
- Use environment variables for secrets
- Implement key rotation procedures

### 2. Access Control

- Limit admin access to trusted parties
- Implement multi-signature requirements
- Regular access reviews
- Emergency pause capabilities

### 3. Monitoring

- Real-time transaction monitoring
- Automated alert systems
- Regular security audits
- Incident response procedures

## Rollback Procedures

### 1. Emergency Pause

```bash
# Pause all operations
aptos move run --function-id <contract_address>::emergency::pause
```

### 2. Emergency Withdrawal

```bash
# Allow users to withdraw funds
aptos move run --function-id <contract_address>::emergency::withdraw \
  --args address:<user_address>
```

### 3. System Recovery

```bash
# Resume operations
aptos move run --function-id <contract_address>::emergency::resume
```

## Support

For deployment support:

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/avila-protocol/avila-contracts/issues)
- **Discord**: [Avila Protocol Discord](https://discord.gg/avila-protocol)
- **Email**: support@avila-protocol.com

## Next Steps

After successful deployment:

1. **Configure Oracle**: Add price updaters and assets
2. **Set Parameters**: Configure factory and vault parameters
3. **Test Integration**: Verify all modules work together
4. **Monitor Performance**: Set up monitoring and alerting
5. **Community Launch**: Announce to community and users 