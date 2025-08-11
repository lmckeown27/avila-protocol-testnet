# Avila Protocol Scripts

This directory contains utility scripts for the Avila Protocol project.

## Aptos CLI Installation

### Quick Installation

To install the Aptos CLI tool, run:

```bash
./scripts/install_aptos_cli.sh
```

### Manual Installation

#### macOS
```bash
# Using Homebrew (recommended)
brew install aptos

# Verify installation
aptos --version
```

#### Linux
```bash
# Using official installation script
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Verify installation
aptos --version
```

### Verification

After installation, verify the Aptos CLI is working:

```bash
# Check version
aptos --version

# Test basic functionality
aptos help

# Test Move commands
aptos move --help
```

### System Requirements

- **macOS**: Homebrew package manager
- **Linux**: Python 3.x
- **Architecture**: x86_64 or arm64

### Troubleshooting

#### macOS Issues
- If Homebrew is not installed: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- If installation fails: `brew doctor` to check Homebrew health

#### Linux Issues
- Ensure Python 3 is installed: `python3 --version`
- Check PATH includes the installation directory
- Try running with sudo if permission issues occur

### Available Commands

Once installed, you can use:

```bash
# General commands
aptos --help                    # Show all commands
aptos --version                 # Show version
aptos config --help             # Configuration commands

# Move development commands
aptos move compile              # Compile Move modules
aptos move test                 # Run Move tests
aptos move publish              # Publish modules to blockchain
aptos move run                  # Run Move functions
aptos move view                 # View Move resources

# Account management
aptos account list              # List accounts
aptos account create            # Create new account
aptos key generate              # Generate keys

# Network interaction
aptos node check-connectivity   # Check network connectivity
aptos info                      # Show build information
```

## Other Scripts

- `deploy.js` - Node.js deployment script for smart contracts
- `install_aptos_cli.sh` - Automated Aptos CLI installation script 