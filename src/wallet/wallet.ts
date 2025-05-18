/**
 * Wallet management module for handling HD wallets and key derivation
 * @module Wallet
 */

import { KeystoreManager } from './keystore_manager.ts'
import { MnemonicManager } from './mnemonic_manager.ts'
import { Select } from 'cliffy/prompt'
import { generatePrivateKey, privateKeyToAccount as espacePrivateKeyToAccount } from 'viem/accounts'
import { privateKeyToAccount as corePrivateKeyToAccount } from 'cive/accounts'
import { EncryptionService } from './encryption_service.ts'
import * as bip39 from 'bip39'
import { BIP32Factory } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { Buffer } from 'node:buffer'
import { encode } from 'stablelib/hex'

const bip32 = BIP32Factory(ecc)

/**
 * Manages HD wallet operations including key derivation and mnemonic management
 * @class Wallet
 */
export class Wallet {
	private keystoreManager: KeystoreManager
	private mnemonicManager: MnemonicManager
	private mnemonic?: string

	/**
	 * Creates a new wallet instance
	 * @constructor
	 */
	constructor() {
		this.keystoreManager = new KeystoreManager()
		this.mnemonicManager = new MnemonicManager(this.keystoreManager, new EncryptionService())
	}

	/**
	 * Initializes the keystore with a default mnemonic if none exists
	 * @async
	 * @returns {Promise<void>}
	 */
	async initializeKeystore(): Promise<void> {
		const existingKeystore = await this.keystoreManager.readKeystore()
		if (!existingKeystore) {
			console.warn('No keystore found. Creating a default keystore...')
			this.keystoreManager.getKeystore().push({
				type: 'plaintext',
				label: 'Default Keystore',
				mnemonic: 'test test test test test test test test test test test junk',
			})
			this.keystoreManager.setActiveIndex(0)
			await this.keystoreManager.writeKeystore()
			console.warn('Default keystore created and activated.')
		} else {
			this.keystoreManager.setKeystore(existingKeystore.keystore)
			this.keystoreManager.setActiveIndex(existingKeystore.activeIndex)
		}
		this.mnemonic = await this.getActiveMnemonic()
	}

	/**
	 * Gets the currently active mnemonic
	 * @async
	 * @returns {Promise<string>} The active mnemonic phrase
	 * @throws {Error} If no active mnemonic is selected
	 */
	async getActiveMnemonic(): Promise<string> {
		if (this.keystoreManager.getActiveIndex() === null || this.keystoreManager.getActiveIndex() < 0) {
			throw new Error('No active mnemonic selected.')
		}
		if (!this.mnemonic) {
			const mnemonicObj = this.keystoreManager.getKeystore()[this.keystoreManager.getActiveIndex()]
			return mnemonicObj.type === 'encoded'
				? await this.mnemonicManager.encryptionService.decryptMnemonic(mnemonicObj.mnemonic)
				: mnemonicObj.mnemonic
		}
		return this.mnemonic
	}

	/**
	 * Adds a new mnemonic to the keystore
	 * @async
	 * @returns {Promise<void>}
	 */
	async addMnemonic(): Promise<void> {
		const newIndex = await this.mnemonicManager.addMnemonic()

		const setActive = await Select.prompt({
			message: 'Would you like to set this as your active mnemonic?',
			options: [
				{ name: 'Yes', value: 'yes' },
				{ name: 'No', value: 'no' },
			],
		})

		if (setActive === 'yes') {
			this.keystoreManager.setActiveIndex(newIndex)
			await this.keystoreManager.writeKeystore()
			this.mnemonic = await this.getActiveMnemonic()
			console.log(`Active wallet set to: ${this.getActiveMnemonicLabel()}`)
		}
	}

	/**
	 * Prompts user to select an active mnemonic
	 * @async
	 * @returns {Promise<void>}
	 */
	async selectActiveMnemonic(): Promise<void> {
		const currentIndex = this.keystoreManager.getActiveIndex()
		const selectedIndex = await Select.prompt({
			message: 'Select the active mnemonic:',
			options: this.keystoreManager.getKeystore().map((mnemonicObj, index) => ({
				name: mnemonicObj.label,
				value: String(index),
			})),
		})

		this.keystoreManager.setActiveIndex(Number(selectedIndex))
		await this.keystoreManager.writeKeystore()
		if (Number(selectedIndex.value) !== currentIndex) {
			this.mnemonic = await this.getActiveMnemonic()
		}
		console.log(
			`Active wallet set to: ${this.getActiveMnemonicLabel()}`,
		)
	}

	/**
	 * Generates a new random private key
	 * @returns {`0x${string}`} Generated private key
	 */
	generatePrivateKey(): `0x${string}` {
		return generatePrivateKey()
	}

	/**
	 * Gets the label of the active mnemonic
	 * @returns {string} Active mnemonic label
	 * @throws {Error} If no active mnemonic is selected
	 */
	getActiveMnemonicLabel(): string {
		if (this.keystoreManager.getActiveIndex() === null || this.keystoreManager.getActiveIndex() < 0) {
			throw new Error('No active mnemonic selected.')
		}
		const mnemonicObj = this.keystoreManager.getKeystore()[this.keystoreManager.getActiveIndex()]
		return mnemonicObj.label
	}

	/**
	 * Derives a private key from the active mnemonic using a derivation path
	 * @private
	 * @async
	 * @param {string} derivationPath - BIP32 derivation path
	 * @returns {Promise<string>} Derived private key
	 * @throws {Error} If mnemonic is invalid or derivation fails
	 */
	private async derivePrivateKey(derivationPath: string): Promise<string> {
		const mnemonic = await this.getActiveMnemonic()
		if (!bip39.validateMnemonic(mnemonic)) {
			throw new Error('Invalid mnemonic')
		}

		const seed = await bip39.mnemonicToSeed(mnemonic)
		const root = bip32.fromSeed(new Uint8Array(seed))
		const child = root.derivePath(derivationPath)

		if (!child.privateKey) {
			throw new Error('Unable to derive private key')
		}

		return `0x${encode(child.privateKey)}`
	}

	/**
	 * Derives a private key using a custom derivation path
	 * @async
	 * @param {string} derivationPath - BIP32 derivation path
	 * @returns {Promise<string>} Derived private key
	 */
	privateKeyByDerivationPath(derivationPath: string): Promise<string> {
		return this.derivePrivateKey(derivationPath)
	}

	/**
	 * Derives an eSpace private key at a specific index
	 * @async
	 * @param {number} index - Derivation index
	 * @returns {Promise<string>} Derived private key
	 */
	espacePrivateKey(index: number): Promise<string> {
		return this.derivePrivateKey(`m/44'/60'/0'/0/${index}`)
	}

	/**
	 * Derives a Core private key at a specific index
	 * @async
	 * @param {number} index - Derivation index
	 * @returns {Promise<string>} Derived private key
	 */
	corePrivateKey(index: number): Promise<string> {
		return this.derivePrivateKey(`m/44'/503'/0'/0/${index}`)
	}

	/**
	 * Deletes a mnemonic from the keystore
	 * @async
	 * @returns {Promise<void>}
	 * @throws {Error} If there are no additional mnemonics to delete
	 */
	async deleteMnemonic(): Promise<void> {
		const keystore = this.keystoreManager.getKeystore()
		if (keystore.length <= 1) {
			throw new Error('No additional mnemonics to delete')
		}

		const selectedIndex = await Select.prompt({
			message: 'Select the mnemonic to delete:',
			options: keystore.slice(1).map((mnemonicObj, index) => ({
				name: `${mnemonicObj.label}${index + 1 === this.keystoreManager.getActiveIndex() ? ' (active)' : ''}`,
				value: String(index + 1),
			})),
		})

		// Confirm deletion
		const confirm = await Select.prompt({
			message: 'Are you sure you want to delete this mnemonic?',
			options: [
				{ name: 'No, cancel', value: 'no' },
				{ name: 'Yes, delete', value: 'yes' },
			],
		})

		if (confirm === 'yes') {
			await this.mnemonicManager.deleteMnemonic(Number(selectedIndex))
			// Reset the cached mnemonic if we deleted the active one
			if (Number(selectedIndex) === this.keystoreManager.getActiveIndex()) {
				this.mnemonic = undefined
			}
		}
	}

	async espaceAddress(index: number): Promise<string> {
		const privateKey = await this.espacePrivateKey(index)
		return espacePrivateKeyToAccount(privateKey as `0x${string}`).address
	}

	async coreAddress(index: number): Promise<string> {
		const privateKey = await this.corePrivateKey(index)
		return corePrivateKeyToAccount(privateKey as `0x${string}`, { networkId: 1029 }).address
	}
}
