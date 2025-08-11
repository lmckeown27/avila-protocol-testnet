# Project Structure

This document outlines the restructured Avila Protocol project organization.

## Overview

The project has been reorganized into a monorepo structure with clear separation of concerns:

```
avila-protocol/
├── backend/
│   ├── smart-contracts/     # Move smart contracts and tests
│   └── typescript/          # Backend TypeScript services
├── frontend/                # Frontend application (placeholder)
├── docs/                    # Documentation and architecture
├── package.json             # Root workspace configuration
├── LICENSE                  # Project license
└── README.md               # Project overview and setup
```

## Directory Details

### `backend/smart-contracts/`

Contains all Move smart contracts that power the Avila Protocol:

```
smart-contracts/
├── sources/                 # Move source files
│   ├── avila_protocol.move
│   ├── options_core.move
│   ├── order_book.move
│   ├── margin_engine.move
│   ├── settlement_engine.move
│   ├── collateral_vault.move
│   ├── tokenized_asset_registry.move
│   ├── compliance_gate.move
│   ├── governance_admin.move
│   ├── price_oracle_adapter.move
│   ├── events_and_auditing.move
│   ├── multi_stock_mock.move
│   └── multi_stock_mock_test.move
├── tests/                   # Test files
├── temp_test/              # Temporary test files
├── build/                  # Build artifacts
├── Move.toml               # Move package configuration
└── README.md               # Smart contracts documentation
```

### `backend/typescript/`

TypeScript services for deployment, management, and integration:

```
typescript/
├── deploy.js               # Main deployment script
├── deploy_protocol.js      # Protocol-specific deployment
├── install_aptos_cli.sh   # CLI installation script
├── package.json            # TypeScript dependencies
├── tsconfig.json           # TypeScript configuration
└── README.md               # Backend services documentation
```

### `frontend/`

Frontend application for user interaction (currently a placeholder):

```
frontend/
├── package.json            # Frontend dependencies
└── README.md               # Frontend development guide
```

### `docs/`

Comprehensive documentation:

```
docs/
├── ARCHITECTURE.md         # Protocol architecture
├── DEPLOYMENT.md           # Deployment instructions
├── PROTOCOL_ARCHITECTURE.md # Detailed protocol design
├── SECURITY.md             # Security considerations
└── SMART_CONTRACT_ARCHITECTURE.md # Smart contract details
```

## Benefits of Restructuring

### 1. **Clear Separation of Concerns**
- Smart contracts are isolated in their own directory
- Backend services are separated from blockchain logic
- Frontend is prepared for future development
- Documentation is centralized and organized

### 2. **Improved Developer Experience**
- Developers can focus on specific components
- Clear entry points for each technology stack
- Consistent project structure across components
- Easier onboarding for new contributors

### 3. **Better Maintainability**
- Modular architecture allows independent updates
- Clear dependencies between components
- Easier testing and debugging
- Simplified deployment processes

### 4. **Scalability**
- New components can be added easily
- Technology stacks can evolve independently
- Team members can work on different components
- Clear integration points between layers

## Development Workflows

### Smart Contract Development
```bash
cd backend/smart-contracts
aptos move test
aptos move compile
```

### Backend Service Development
```bash
cd backend/typescript
npm install
npm run build
npm run deploy:testnet
```

### Frontend Development (Future)
```bash
cd frontend
npm install
npm run dev
```

### Full Project Operations
```bash
# From root directory
npm run build              # Build all components
npm run test:contracts     # Test smart contracts
npm run deploy:testnet     # Deploy to testnet
npm run install:all        # Install all dependencies
```

## Integration Points

- **Smart Contracts ↔ Aptos**: Direct blockchain interaction via Move
- **TypeScript ↔ Smart Contracts**: SDK-based integration via Aptos SDK
- **Frontend ↔ Backend**: API-based communication (future implementation)
- **Documentation ↔ All Components**: Centralized reference for all systems

## Migration Notes

The restructuring involved:
1. Moving Move files to `backend/smart-contracts/sources/`
2. Relocating TypeScript scripts to `backend/typescript/`
3. Creating placeholder frontend structure
4. Consolidating documentation in `docs/`
5. Updating package.json files for new structure
6. Creating comprehensive README files for each component

## Future Considerations

- Frontend implementation when ready
- Additional backend services as needed
- Enhanced testing infrastructure
- CI/CD pipeline integration
- Docker containerization
- API documentation generation

---

*This structure provides a solid foundation for the Avila Protocol's continued development and growth.* 