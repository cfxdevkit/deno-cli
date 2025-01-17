# Devkit-CLI

## Overview

`Devkit-CLI` is a command-line interface (CLI) tool designed to assist developers working with the Conflux blockchain. It provides an intuitive way to manage local development nodes, wallets, and essential utilities for testing and configuration.

---
## 🚀 Getting Started

For detailed information and step-by-step instructions on how to utilize this repository effectively, please refer to our comprehensive [**Wiki**](https://github.com/cfxdevkit/deno-cli/wiki).

---
## Features

- **Node Management**:
  - Start, stop, and monitor a development node
  - Real-time transaction monitoring with live updates
  - Configurable block intervals and chain IDs
  - Support for both Core and eSpace networks
- **Wallet Operations**:
  - Manage HDWallets with secure keystore encryption
  - Generate or import mnemonics with BIP-39 support
  - Derive private keys with custom derivation paths
  - Multiple wallet support with easy switching
  - Secure deletion of non-default wallets
- **Blockchain Utilities**:
  - Fund Core and eSpace wallets using a built-in faucet
  - Real-time balance checking across networks
  - Cross-space transaction monitoring
  - Support for both hex and base32 address formats
- **Configuration Management**:
  - Interactive configuration updates via menu system
  - Customizable RPC ports for both networks
  - Flexible block interval settings
  - Persistent configuration storage
- **Cross-Space Integration**:
  - Unified wallet management across Core and eSpace
  - Seamless cross-space transfers
  - Automatic address format conversion
  - Consistent transaction handling

---

## Usage

Run `devkit` with the desired commands and options:

```bash
devkit [command] [options]
```

### Commands

#### Node Management
- **`start`**: Start the development node and monitor transactions in real-time.
  - Additional options and prompts will allow you to send funds via the faucet.
  - **Keyboard Shortcuts**:
    - `f`: Open faucet interface
    - `b`: Check balance of an address
    - `q`: Gracefully stop the node
    - `Ctrl+C`: Force stop the node

#### Wallet Management
- **`wallet`**: Configure and manage local HDWallets.
  - **`add`**: Add or generate a new mnemonic in the keystore.
    - Supports both generation and word-by-word import
    - BIP-39 word list validation
  - **`delete`**: Remove a non-default mnemonic from the keystore
  - **`select`**: Select the active mnemonic for use.
  - **`show`**: Display the currently active mnemonic.
  - **`private-key`**: Manage private keys.
    - Options:
      - `--derivation-path [path]`: Specify a custom derivation path for the private key.
      - `--espace`: Use the eSpace network (default).
      - `--core`: Use the Core network.
      - `--index [index]`: Specify the index for key derivation (default: 0).

#### Configuration Management
- **`config`**: View and update configuration settings.
  - **`view`**: Display the current configuration.
  - **`update`**: Interactively update configuration settings via a menu.
    - Customize RPC ports
    - Set block intervals
    - Configure chain IDs
    - Update mining author

---

## Examples

### Starting the Node
```bash
devkit start
```

This will initialize the development node and allow you to monitor transactions. Use the following shortcuts while monitoring:
- **`f`**: Use the faucet to send funds.
- **`b`**: Check address balance.
- **`q` or `Ctrl+C`**: Stop the node and exit.

### Managing Wallets
```bash
# Add a new wallet
devkit wallet add

# Select active wallet
devkit wallet select

# Get private key for eSpace
devkit wallet private-key --espace --index 0

# Get private key for Core
devkit wallet private-key --core --index 0
```

### Configuration Management
```bash
# View current config
devkit config view

# Update config interactively
devkit config update
```

This will provide an interactive menu to update configuration options such as port numbers, chain IDs, and block intervals.

---

## Development

To contribute or modify the CLI:

1. Clone the repository.
2. Install dependencies:
   ```bash
   deno cache src/cli.ts
   ```
3. Run the CLI locally:
   ```bash
   deno run --allow-all src/cli.ts
   ```

### Technical Details

- Built with Deno and TypeScript
- Uses BIP-39 for mnemonic generation and validation
- Implements secure keystore encryption
- Supports both WebSocket and HTTP RPC endpoints
- Real-time transaction monitoring with configurable polling
- Cross-platform compatible

---

## 📢 Need Help or Have Questions?

If you encounter issues or have questions related to this repository, you can:

- **Raise an Issue:** Submit your query or report an issue using [this link](https://github.com/cfxdevkit/deno-cli/issues/new/choose).  
- **Join the Community:** Connect with fellow Conflux developers and get assistance via:  
  - **Telegram:** [ConfluxDevs](https://t.me/ConfluxDevs)  
  - **Discord:** [Conflux Network Developers](https://discord.com/channels/707952293412339843/707952293856673887)  

## 🌐 Stay Connected

Join the vibrant Conflux developer community and stay updated with the latest tools, tips, and discussions. Whether you're a seasoned developer or just getting started, we're here to help you succeed.

Happy coding! 🚀
