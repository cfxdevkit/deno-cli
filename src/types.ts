/**
 * Core blockchain types for handling blocks and transactions
 * @module Types
 */

/**
 * Represents a block in the blockchain
 * @interface Block
 * @property {bigint} [blockNumber] - The block number in Core Space
 * @property {bigint | number} timestamp - Block timestamp
 * @property {bigint} [number] - The block number in eSpace
 */
export interface Block {
	blockNumber?: bigint
	timestamp: bigint | number
	number?: bigint // For espace block
}

/**
 * Extended block information with chain identification
 * @interface BlockInfo
 * @property {bigint} number - Block number
 * @property {string} timestamp - Formatted timestamp
 * @property {string} label - Chain identifier ('core' or 'espace')
 */
export interface BlockInfo {
	number: bigint
	timestamp: string
	label: string
}

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
export interface Transaction {
	hash: string
	from: string
	to: `0x${string}` | null
	value: bigint | string
	gas: bigint
	gasPrice?: bigint | undefined
}

// --- Types ---
/**
 * Entry in the keystore for storing mnemonics
 * @interface KeystoreEntry
 * @property {'plaintext' | 'encoded'} type - Storage type of the mnemonic
 * @property {string} label - User-friendly label for the mnemonic
 * @property {string} mnemonic - The mnemonic phrase (either plaintext or encoded)
 */
export type KeystoreEntry = {
	type: 'plaintext' | 'encoded'
	label: string
	mnemonic: string
}

/**
 * Structure of the keystore file
 * @interface KeystoreFile
 * @property {KeystoreEntry[]} keystore - Array of keystore entries
 * @property {number | null} activeIndex - Index of the currently active mnemonic
 */
export type KeystoreFile = {
	keystore: KeystoreEntry[]
	activeIndex: number | null
}
