# Devkit-CLI

## Overview

`Devkit-CLI` is a command-line interface (CLI) tool designed to assist developers working with the Conflux blockchain. It provides an intuitive way to manage local development nodes, wallets, and essential utilities for testing and configuration.

---
## 🚀 Getting Started

For detailed information and step-by-step instructions on how to utilize this repository effectively, please refer to our comprehensive [**Wiki**](https://github.com/cfxdevkit/deno-cli/wiki).

---
## Features

- **Node Management**:
  - Start, stop, and monitor a development node.
- **Wallet Operations**:
  - Manage HDWallets, including mnemonic configuration and private key derivation.
- **Blockchain Utilities**:
  - Fund Core and eSpace wallets using a built-in faucet.
  - Scan nodes for transactions in real-time.
- **Configuration Management**:
  - View and update configuration settings for the development node.
- **Cross-Space**:
  - Simplified initialization and management of accounts across Core and eSpace networks from the same mnemonic.

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

#### Wallet Management
- **`wallet`**: Configure and manage local HDWallets.
  - **`add`**: Add or generate a new mnemonic in the keystore.
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
---

## Examples

### Starting the Node
```bash
devkit start
```

This will initialize the development node and allow you to monitor transactions. Use the following shortcuts while monitoring:
- **`f`**: Use the faucet to send funds.
- **`q` or `Ctrl+C`**: Stop the node and exit.

### Adding a Mnemonic
```bash
devkit wallet add
```
### Selecting active mnemonic
```bash
devkit wallet select
```


### Viewing Configuration
```bash
devkit config view
```

### Updating Configuration
```bash
devkit config update
```

This will provide an interactive menu to update configuration options such as port numbers, chain IDs, and block intervals.

---

## Development

To contribute or modify the CLI:

1. Clone the repository.
2. Modify and test commands in the `src` directory.
3. Run the CLI locally using:
   ```bash
   deno run --allow-all src/cli.ts
   ```
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
