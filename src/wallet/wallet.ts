import { HDWallet } from '@conflux-dev/hdwallet'
import { KeystoreManager } from './keystore_manager.ts'
import { MnemonicManager } from './mnemonic_manager.ts'
import { Select } from 'cliffy/prompt'
import { generatePrivateKey } from 'viem/accounts'
import { EncryptionService } from './encryption_service.ts'

export class Wallet {
	private keystoreManager: KeystoreManager
	private mnemonicManager: MnemonicManager
	private hdWallet?: HDWallet

	constructor() {
		this.keystoreManager = new KeystoreManager()
		this.mnemonicManager = new MnemonicManager(this.keystoreManager, new EncryptionService())
	}

	async initializeKeystore(): Promise<void> {
		const existingKeystore = await this.keystoreManager.readKeystore()
		if (!existingKeystore) {
			console.log('No keystore found. Creating a default keystore...')
			this.keystoreManager.getKeystore().push({
				type: 'plaintext',
				label: 'Default Keystore',
				mnemonic: 'test test test test test test test test test test test junk',
			})
			this.keystoreManager.setActiveIndex(0)
			await this.keystoreManager.writeKeystore()
			console.log('Default keystore created and activated.')
		} else {
			this.keystoreManager.setKeystore(existingKeystore.keystore)
			this.keystoreManager.setActiveIndex(existingKeystore.activeIndex)
		}
		this.hdWallet = new HDWallet(await this.getActiveMnemonic())
	}

	async getActiveMnemonic(): Promise<string> {
		if (this.keystoreManager.getActiveIndex() === null || this.keystoreManager.getActiveIndex() < 0) {
			throw new Error('No active mnemonic selected.')
		}
		let mnemonic: string = ''
		if (!this.hdWallet) {
			const mnemonicObj = this.keystoreManager.getKeystore()[this.keystoreManager.getActiveIndex()]
			mnemonic = mnemonicObj.type === 'encoded'
				? await this.mnemonicManager.encryptionService.decryptMnemonic(mnemonicObj.mnemonic)
				: mnemonicObj.mnemonic
		} else {
			mnemonic = this.hdWallet.mnemonic
		}
		return mnemonic
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
			this.hdWallet = new HDWallet(await this.getActiveMnemonic())
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

	privateKeyByDerivationPath(derivationPath: string): string {
		return `0x${this.hdWallet!.getPrivateKey(derivationPath).toString('hex')}`
	}

	espacePrivateKey(index: number): string {
		return this.privateKeyByDerivationPath(`m/44'/60'/0'/0/${index}`)
	}

	corePrivateKey(index: number): string {
		return this.privateKeyByDerivationPath(`m/44'/503'/0'/0/${index}`)
	}
}
