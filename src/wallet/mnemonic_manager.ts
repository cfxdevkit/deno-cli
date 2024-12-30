import { Input, Select } from 'cliffy/prompt'
import { english } from 'viem/accounts'
import { KeystoreManager } from './keystore_manager.ts'
import { EncryptionService } from './encryption_service.ts'
import { generateMnemonic } from 'bip39'

export class MnemonicManager {
	private keystoreManager: KeystoreManager
	public encryptionService: EncryptionService

	constructor(keystoreManager: KeystoreManager, encryptionService: EncryptionService) {
		this.keystoreManager = keystoreManager
		this.encryptionService = encryptionService
	}

	async addMnemonic(): Promise<void> {
		const storageChoice = await Select.prompt({
			message: 'Choose storage option for the mnemonic:',
			options: [
				{ name: 'Store encrypted', value: 'e' },
				{ name: 'Store in plaintext', value: 'p' },
			],
		})

		const mnemonic = await this.promptForMnemonic()

		const defaultLabel = `Mnemonic ${this.keystoreManager.getKeystore().length + 1}`
		const label = await Input.prompt({
			message: 'Enter a label for this mnemonic:',
			default: defaultLabel,
		})

		if (storageChoice === 'p') {
			this.keystoreManager.getKeystore().push({ type: 'plaintext', label, mnemonic })
		} else {
			const encryptedMnemonic = await this.encryptionService.encryptMnemonic(mnemonic)
			this.keystoreManager.getKeystore().push({ type: 'encoded', label, mnemonic: encryptedMnemonic })
		}

		await this.keystoreManager.writeKeystore()
		console.error(storageChoice === 'p' ? 'Mnemonic stored in plaintext.' : 'Mnemonic stored securely.')
	}

	private async promptForMnemonic(): Promise<string> {
		const userChoice = await Select.prompt({
			message: 'Generate or import a mnemonic?',
			options: [
				{ name: 'Generate a new mnemonic', value: 'g' },
				{ name: 'Insert an existing mnemonic', value: 'i' },
			],
		})
		return userChoice === 'i' ? await this.importMnemonic() : this.generateMnemonic()
	}

	generateMnemonic(): string {
		return generateMnemonic()
	}

	private async importMnemonic(): Promise<string> {
		console.log('\nPlease enter your mnemonic key one word at a time.')
		const words: string[] = []
		for (let i = 1; i <= 12; i++) {
			const word = await Input.prompt({
				message: `Enter word ${i} of 12`,
				suggestions: english,
				validate: (input) =>
					english.includes(input) || 'Invalid word. Please enter a valid BIP-39 mnemonic word.',
			})
			words.push(word)
		}
		return words.join(' ')
	}
}
