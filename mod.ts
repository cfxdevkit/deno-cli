/**
 * A module exporting core classes and configuration generators for task management and blockchain operations.
 * 
 * This module provides access to the core functionality of the Conflux development kit,
 * including wallet management, blockchain clients, transaction monitoring, and utility functions.
 * 
 * @module
 */

/**
 * Core blockchain types for handling blocks and transactions
 * @namespace Types
 */

/**
 * Represents a block in the blockchain
 * @interface Block
 * @property {bigint} [blockNumber] - The block number in Core Space
 * @property {bigint | number} timestamp - Block timestamp
 * @property {bigint} [number] - The block number in eSpace
 */

/**
 * Extended block information with chain identification
 * @interface BlockInfo
 * @property {bigint} number - Block number
 * @property {string} timestamp - Formatted timestamp
 * @property {string} label - Chain identifier ('core' or 'espace')
 */

/**
 * Represents a blockchain transaction
 * @interface Transaction
 * @property {string} hash - Transaction hash
 * @property {string} from - Sender address
 * @property {`0x${string}` | null} to - Recipient address
 * @property {bigint | string} value - Transaction value
 * @property {bigint} gas - Gas used
 * @property {bigint | undefined} gasPrice - Gas price in wei
 */

/**
 * Entry in the keystore for storing mnemonics
 * @interface KeystoreEntry
 * @property {'plaintext' | 'encoded'} type - Storage type of the mnemonic
 * @property {string} label - User-friendly label for the mnemonic
 * @property {string} mnemonic - The mnemonic phrase (either plaintext or encoded)
 */

/**
 * Structure of the keystore file
 * @interface KeystoreFile
 * @property {KeystoreEntry[]} keystore - Array of keystore entries
 * @property {number | null} activeIndex - Index of the currently active mnemonic
 */
export type {
  Block,
  BlockInfo,
  Transaction,
  KeystoreEntry,
  KeystoreFile,
} from './src/types.ts'

// Core Classes

/**
 * Manages HD wallet operations including mnemonic generation, storage, and private key derivation
 * @class Wallet
 */
export { Wallet } from './src/wallet/wallet.ts'

/**
 * Handles keystore file operations for secure mnemonic storage
 * @class KeystoreManager
 */
export { KeystoreManager } from './src/wallet/keystore_manager.ts'

/**
 * Manages mnemonic operations including generation, import, and deletion
 * @class MnemonicManager
 */
export { MnemonicManager } from './src/wallet/mnemonic_manager.ts'

/**
 * Provides encryption and decryption services for secure mnemonic storage
 * @class EncryptionService
 */
export { EncryptionService } from './src/wallet/encryption_service.ts'

// Blockchain Clients

/**
 * Client for interacting with Conflux Core Space
 * Provides methods for transactions, balance checks, and contract interactions
 * @class coreClient
 */
export { coreClient } from './src/clients/cive.ts'

/**
 * Client for interacting with Conflux eSpace (EVM compatible space)
 * Provides methods for Ethereum-compatible operations
 * @class espaceClient
 */
export { espaceClient } from './src/clients/viem.ts'

/**
 * Monitors transactions across both Core Space and eSpace
 * Provides real-time transaction and block updates
 * @class TransactionMonitor
 */
export { TransactionMonitor } from './src/clients/node.ts'

/**
 * Manages the development node server
 * Handles server lifecycle and configuration
 * @class ServerManager
 */
export { ServerManager } from './src/server.ts'

// Utilities

/**
 * Provides CLI spinner functionality for visual feedback
 * Supports custom messages and colors for better UX
 * @class CliSpinner
 */
export { CliSpinner } from './src/spinner.ts'

/**
 * Terminal utility functions for handling display constraints
 * @namespace TerminalUtils
 */

/**
 * Gets the current terminal dimensions
 * @function getTerminalSize
 * @returns {Object} Object containing columns and rows
 */

/**
 * Truncates text to fit within terminal constraints
 * @function truncateText
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length allowed
 * @returns {string} Truncated text
 */
export { getTerminalSize, truncateText } from './src/utils/terminal.ts'
