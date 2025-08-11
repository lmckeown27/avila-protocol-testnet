#!/bin/bash

# Avila Protocol - Aptos CLI Installation Script
# This script installs the Aptos CLI tool on macOS and Linux systems

set -e  # Exit on any error

echo "🚀 Installing Aptos CLI for Avila Protocol..."

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos";;
        Linux*)     echo "linux";;
        *)          echo "unsupported";;
    esac
}

# Function to detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64)     echo "x86_64";;
        arm64|aarch64) echo "arm64";;
        *)          echo "unsupported";;
    esac
}

# Function to install on macOS
install_macos() {
    echo "📱 Detected macOS system"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    echo "🍺 Installing Aptos CLI via Homebrew..."
    brew install aptos
    
    echo "✅ Aptos CLI installed successfully on macOS"
}

# Function to install on Linux
install_linux() {
    echo "🐧 Detected Linux system"
    
    # Check if Python3 is available
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python3 is not installed. Please install Python3 first."
        exit 1
    fi
    
    echo "📥 Downloading and installing Aptos CLI via official script..."
    curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
    
    echo "✅ Aptos CLI installed successfully on Linux"
}

# Function to verify installation
verify_installation() {
    echo "🔍 Verifying Aptos CLI installation..."
    
    if command -v aptos &> /dev/null; then
        VERSION=$(aptos --version)
        echo "✅ Aptos CLI is installed: $VERSION"
        
        echo "🧪 Testing basic functionality..."
        aptos help > /dev/null 2>&1
        echo "✅ Basic functionality test passed"
        
        echo "🧪 Testing Move commands..."
        aptos move --help > /dev/null 2>&1
        echo "✅ Move commands test passed"
        
        echo ""
        echo "🎉 Aptos CLI installation completed successfully!"
        echo "📋 Available commands:"
        echo "   aptos --help          # Show all commands"
        echo "   aptos move --help     # Show Move-specific commands"
        echo "   aptos --version       # Show version"
        
    else
        echo "❌ Aptos CLI installation failed or not found in PATH"
        exit 1
    fi
}

# Function to check if already installed
check_existing() {
    if command -v aptos &> /dev/null; then
        VERSION=$(aptos --version)
        echo "ℹ️  Aptos CLI is already installed: $VERSION"
        echo "🔄 Checking for updates..."
        
        # On macOS, check Homebrew for updates
        if [[ "$(detect_os)" == "macos" ]]; then
            brew outdated aptos || echo "✅ Aptos CLI is up to date"
        fi
        
        verify_installation
        exit 0
    fi
}

# Main installation process
main() {
    echo "🔧 Avila Protocol - Aptos CLI Installer"
    echo "========================================"
    
    # Check if already installed
    check_existing
    
    # Detect OS and architecture
    OS=$(detect_os)
    ARCH=$(detect_arch)
    
    echo "🖥️  System: $OS ($ARCH)"
    
    # Install based on OS
    case $OS in
        "macos")
            install_macos
            ;;
        "linux")
            install_linux
            ;;
        *)
            echo "❌ Unsupported operating system: $OS"
            echo "   This script supports macOS and Linux only."
            exit 1
            ;;
    esac
    
    # Verify installation
    verify_installation
}

# Run main function
main "$@" 