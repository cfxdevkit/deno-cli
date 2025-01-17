import { KeystoreManager } from './keystore_manager.ts'
import { MnemonicManager } from './mnemonic_manager.ts'
import { Select } from 'cliffy/prompt'
import { generatePrivateKey } from 'viem/accounts'
import { EncryptionService } from './encryption_service.ts'
import * as bip39 from 'bip39'
import { BIP32Factory } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { Buffer } from 'node:buffer'
import { encode } from 'stablelib/hex'

const bip32 = BIP32Factory(ecc)

export class Wallet {
	private keystoreManager: KeystoreManager
	private mnemonicManager: MnemonicManager
	private mnemonic?: string

	constructor() {
		this.keystoreManager = new KeystoreManager()
		this.mnemonicManager = new MnemonicManager(this.keystoreManager, new EncryptionService())
	}

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

	async addMnemonic(): Promise<void> {
		await this.mnemonicManager.addMnemonic()
	}

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

	generatePrivateKey(): `0x${string}` {
		return generatePrivateKey()
	}

	getActiveMnemonicLabel(): string {
		if (this.keystoreManager.getActiveIndex() === null || this.keystoreManager.getActiveIndex() < 0) {
			throw new Error('No active mnemonic selected.')
		}
		const mnemonicObj = this.keystoreManager.getKeystore()[this.keystoreManager.getActiveIndex()]
		return mnemonicObj.label
	}

	private async derivePrivateKey(derivationPath: string): Promise<string> {
		const mnemonic = await this.getActiveMnemonic()
		if (!bip39.validateMnemonic(mnemonic)) {
			throw new Error('Invalid mnemonic')
		}

		const seed = await bip39.mnemonicToSeed(mnemonic)
		const root = bip32.fromSeed(Buffer.from(seed))
		const child = root.derivePath(derivationPath)

		if (!child.privateKey) {
			throw new Error('Unable to derive private key')
		}

		return `0x${encode(child.privateKey)}`
	}

	privateKeyByDerivationPath(derivationPath: string): Promise<string> {
		return this.derivePrivateKey(derivationPath)
	}

	espacePrivateKey(index: number): Promise<string> {
		return this.derivePrivateKey(`m/44'/60'/0'/0/${index}`)
	}

	corePrivateKey(index: number): Promise<string> {
		return this.derivePrivateKey(`m/44'/503'/0'/0/${index}`)
	}

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
}
