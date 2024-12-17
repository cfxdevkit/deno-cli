# Devkit-CLI

## Overview

`Devkit-CLI` is a powerful command-line interface (CLI) tool designed to assist developers working with Conflux blockchain. It provides an intuitive way to manage local development nodes, wallets, and essential utilities for testing and deployment tasks.

---

## Features

- **Node Management**:
  - Start, stop, and monitor a development node.
  - View logs and errors produced by the node.
- **Wallet Operations**:
  - Manage HDWallets, including mnemonic configuration and private key derivation.
  - Derive Core and eSpace addresses from mnemonics or paths.
- **Blockchain Utilities**:
  - Check account balances.
  - Use the faucet to fund Core and eSpace wallets.
  - Scan nodes for transactions.
- **Cross-Space Calls**:
  - Simplified initialization and management of accounts across Core and eSpace networks.

---

## Usage

Run `devkit` with the desired commands and options:

```bash
devkit [command] [options]
```

### Commands

#### Node Management
- **`start`**: Start the development node.
  - Options:
    - `--logs`: Display logs after starting the node.
    - `--scan`: Scan transactions after starting the node.
- **`stop`**: Stop the development node.
- **`status`**: Display the status of the development node.
- **`logs`**: Show node logs.
- **`errors`**: Display any errors produced by the node.

#### Wallet Management
- **`wallet`**: Configure and manage local HDWallets.
  - **`mnemonic`**: Manage mnemonic phrases.
    - `print`: Print the current mnemonic phrase.
    - `configure`: Configure or import a new mnemonic phrase.
  - **`private-key`**: Manage private keys.
    - Options:
      - `--derivation-path [path]`: Specify a custom derivation path.
      - `--espace`: Use the eSpace network.
      - `--core`: Use the Core network.
      - `--index [index]`: Specify the index for derivation.
  - **`address`**: Derive addresses from mnemonic.
    - Options:
      - `--espace`: Use the eSpace network.
      - `--core`: Use the Core network.
      - `--index [index]`: Specify the index for derivation.

#### Utilities
- **`balance [address]`**: Check the balance of an address or the default genesis account.
- **`faucet [amount] [address]`**: Fund Core and eSpace wallets.

#### Blockchain Tools
- **`scan`**: Scan the node for transactions.

---

## Examples

### Starting the Node
```bash
devkit start --logs
```

### Viewing Balance
```bash
devkit balance 0xYourAddressHere
```

### Funding a Wallet
```bash
devkit faucet 1000 0xRecipientAddress
```

### Configuring Mnemonic
```bash
devkit wallet mnemonic configure
```

---

## Development

To contribute or modify the CLI:

1. Clone the repository.
2. Install dependencies as specified in `deno.json`.
3. Modify and test commands in the `src` directory.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Support

For issues or feature requests, please open an issue on the [GitHub repository](https://github.com/your-repo/devkit-cli).
