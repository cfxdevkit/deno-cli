/**
 * Keystore management module for secure storage of wallet mnemonics
 * @module KeystoreManager
 */

import { ensureFileSync } from '@std/fs'
import { join } from '@std/path'
import { KeystoreEntry, KeystoreFile } from '../types.ts'

/**
 * Interface defining keystore management operations
 * @interface IKeystoreManager
 */
export interface IKeystoreManager {
	/**
	 * Reads the keystore file
	 * @returns {Promise<KeystoreFile | null>} The keystore contents or null if not found
	 */
	readKeystore(): Promise<KeystoreFile | null>

	/**
	 * Writes the current keystore to file
	 * @returns {Promise<void>}
	 */
	writeKeystore(): Promise<void>

	/**
	 * Gets the current keystore entries
	 * @returns {KeystoreEntry[]} Array of keystore entries
	 */
	getKeystore(): KeystoreEntry[]

	/**
	 * Sets the keystore entries
	 * @param {KeystoreEntry[]} keystore - New keystore entries
	 */
	setKeystore(keystore: KeystoreEntry[]): void

	/**
	 * Gets the index of the active mnemonic
	 * @returns {number} Active mnemonic index
	 */
	getActiveIndex(): number

	/**
	 * Sets the active mnemonic index
	 * @param {number | null} index - New active index
	 */
	setActiveIndex(index: number | null): void
}

/**
 * Manages keystore operations for secure mnemonic storage
 * @class KeystoreManager
 * @implements {IKeystoreManager}
 */
export class KeystoreManager implements IKeystoreManager {
	/** Path to the keystore file */
	protected keystorePath: string
	/** Array of keystore entries */
	protected keystore: KeystoreEntry[] = []
	/** Index of the active mnemonic */
	protected activeIndex: number | null = 0

	/**
	 * Creates a new keystore manager instance
	 * @constructor
	 * @param {string} [homeDir] - Optional home directory override for testing
	 */
	constructor(homeDir?: string) {
		this.keystorePath = join(homeDir || Deno.env.get('HOME') || '', '.devkit.keystore.json')
		ensureFileSync(this.keystorePath)
	}

	/**
	 * Reads the keystore file
	 * @async
	 * @returns {Promise<KeystoreFile | null>} The keystore contents or null if not found
	 * @throws {Error} If file read fails for reasons other than not found
	 */
	async readKeystore(): Promise<KeystoreFile | null> {
		try {
			const data = await Deno.readTextFile(this.keystorePath)
			return data.trim() ? JSON.parse(data) : null
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) return null
			throw error
		}
	}

	/**
	 * Writes the current keystore to file
	 * @async
	 * @returns {Promise<void>}
	 */
	async writeKeystore(): Promise<void> {
		const data: KeystoreFile = { keystore: this.keystore, activeIndex: this.activeIndex }
		await Deno.writeTextFile(this.keystorePath, JSON.stringify(data, null, 2))
	}

	/**
	 * Gets the current keystore entries
	 * @returns {KeystoreEntry[]} Array of keystore entries
	 */
	getKeystore() {
		return this.keystore
	}

	/**
	 * Sets the keystore entries
	 * @param {KeystoreEntry[]} keystore - New keystore entries
	 */
	setKeystore(keystore: KeystoreEntry[]) {
		this.keystore = keystore
	}

	/**
	 * Sets the path to the keystore file
	 * @param {string} keystore_path - New keystore file path
	 */
	setKeystorePath(keystore_path: string) {
		this.keystorePath = keystore_path
	}

	/**
	 * Sets the active mnemonic index
	 * @param {number | null} index - New active index
	 */
	setActiveIndex(index: number | null) {
		this.activeIndex = index
	}

	/**
	 * Gets the index of the active mnemonic
	 * @returns {number} Active mnemonic index
	 */
	getActiveIndex(): number {
		return this.activeIndex || 0
	}
}
