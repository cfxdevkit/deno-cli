import { assertEquals, assertRejects } from '@std/assert'
import { ansi } from 'cliffy/ansi'
import { snapshotTest } from 'cliffy/testing'
import { EncryptionService } from './encryption_service.ts'
import { MnemonicManager } from './mnemonic_manager.ts'
import { KeystoreManager } from './keystore_manager.ts'
import { KeystoreEntry, KeystoreFile } from '../types.ts'
import { join } from '@std/path'
import { ensureFileSync } from '@std/fs'
import { validateMnemonic } from 'bip39'
import { Input } from 'cliffy/prompt'
import { Select } from 'cliffy/prompt'

export class MockKeystoreManager extends KeystoreManager {
	// deno-lint-ignore require-await
	override async readKeystore(): Promise<KeystoreFile | null> {
		console.log('Mock readKeystore called.')
		return { keystore: this.keystore, activeIndex: this.activeIndex }
	}
	// deno-lint-ignore require-await
	override async writeKeystore(): Promise<void> {
		console.log('Mock writeKeystore called.')
	}
}

const mnemonic = 'test test test test test test test test test test test junk'

async function createTestEnvironment() {
	const tmpdir = await Deno.makeTempDir()
	const mockKeystoreManager = new MockKeystoreManager(tmpdir)
	const mockEncryptionService = new EncryptionService()
	mockEncryptionService.getRandomValues = (typedArray: Uint8Array) => {
		return typedArray
	}
	// deno-lint-ignore require-await
	mockEncryptionService.encryptMnemonic = async (_mnemonic) => `encrypted:${mnemonic}`

	const mnemonicManager = new MnemonicManager(mockKeystoreManager, mockEncryptionService)
	// Don't mock generateMnemonic to ensure it's covered by tests
	// mnemonicManager.generateMnemonic = () => mnemonic

	return {
		tmpdir,
		mnemonicManager,
		mockKeystoreManager,
		mockEncryptionService,
		cleanup: async () => {
			try {
				await Deno.remove(tmpdir, { recursive: true })
			} catch (_) {
				// Ignore if directory doesn't exist
			}
		}
	}
}

Deno.test('MnemonicManager Tests', async (t) => {
	await t.step('Add generated mnemonic with encryption', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Add generated mnemonic with encryption',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Select "accept default label"
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 1)
					assertEquals(keystore[0].type, 'encoded')
					assertEquals(keystore[0].mnemonic.startsWith('encrypted:'), true)
					assertEquals(keystore[0].label, 'Mnemonic 1')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('Add generated mnemonic plaintext', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Add generated mnemonic plaintext',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select "Store plaintext"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Select "accept default label"
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 1)
					assertEquals(keystore[0].type, 'plaintext')
					const words = keystore[0].mnemonic.split(' ')
					assertEquals(words.length, 12)
					assertEquals(validateMnemonic(keystore[0].mnemonic), true)
					assertEquals(keystore[0].label, 'Mnemonic 1')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('Import mnemonic plaintext', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Import mnemonic plaintext',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select "Store plaintext"
					.cursorDown
					.text('\n') // Select "Insert an existing mnemonic"
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('junk\n')
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 1)
					assertEquals(keystore[0].type, 'plaintext')
					assertEquals(keystore[0].mnemonic, mnemonic)
					assertEquals(keystore[0].label, 'Mnemonic 1')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('Import mnemonic encrypted', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Import mnemonic encrypted',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.cursorDown
					.text('\n') // Select "Insert an existing mnemonic"
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('junk\n')
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 1)
					assertEquals(keystore[0].type, 'encoded')
					assertEquals(keystore[0].mnemonic, `encrypted:${mnemonic}`)
					assertEquals(keystore[0].label, 'Mnemonic 1')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('Multiple mnemonics stored', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Multiple mnemonics stored',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select "Store plaintext"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Select "accept default label"
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Select "accept default label"
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()
					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 2)
					assertEquals(keystore[0].type, 'plaintext')
					assertEquals(keystore[0].mnemonic, mnemonic)
					assertEquals(keystore[1].type, 'encoded')
					assertEquals(keystore[1].mnemonic, `encrypted:${mnemonic}`)
					assertEquals(keystore[0].label, 'Mnemonic 1')
					assertEquals(keystore[1].label, 'Mnemonic 2')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('Cannot delete default mnemonic', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
			])

			await assertRejects(
				async () => {
					await mnemonicManager.deleteMnemonic(0)
				},
				Error,
				'Cannot delete the default mnemonic as it serves as a fallback',
			)
		} finally {
			await cleanup()
		}
	})

	await t.step('Delete non-default mnemonic', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
				{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2 test2 test2' },
			])
			mockKeystoreManager.setActiveIndex(1)

			await mnemonicManager.deleteMnemonic(1)

			const keystore = mockKeystoreManager.getKeystore()
			assertEquals(keystore.length, 1)
			assertEquals(keystore[0].label, 'Default Keystore')
			assertEquals(mockKeystoreManager.getActiveIndex(), 0)
		} finally {
			await cleanup()
		}
	})

	await t.step('Delete active mnemonic updates active index', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
				{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2' },
				{ type: 'plaintext', label: 'Third Mnemonic', mnemonic: 'test3' },
			])
			mockKeystoreManager.setActiveIndex(2)

			await mnemonicManager.deleteMnemonic(2)

			assertEquals(mockKeystoreManager.getActiveIndex(), 0)
			assertEquals(mockKeystoreManager.getKeystore().length, 2)
		} finally {
			await cleanup()
		}
	})

	await t.step('Delete mnemonic updates subsequent active index', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
				{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2' },
				{ type: 'plaintext', label: 'Third Mnemonic', mnemonic: 'test3' },
			])
			mockKeystoreManager.setActiveIndex(2)

			await mnemonicManager.deleteMnemonic(1)

			assertEquals(mockKeystoreManager.getActiveIndex(), 1)
			assertEquals(mockKeystoreManager.getKeystore().length, 2)
		} finally {
			await cleanup()
		}
	})

	await t.step('error handling for invalid mnemonic input', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Error on invalid mnemonic input',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select "Store plaintext"
					.cursorDown
					.text('\n') // Select "Insert an existing mnemonic"
					.text('invalidword\n')
					.text('test\n') // After error, input valid word
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('junk\n')
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 1)
					assertEquals(keystore[0].type, 'plaintext')
					assertEquals(keystore[0].mnemonic, mnemonic)
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('attempt to delete non-existent mnemonic', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
			])

			await assertRejects(
				async () => {
					await mnemonicManager.deleteMnemonic(999) // Invalid index
				},
				Error,
				'Invalid mnemonic index',
			)
		} finally {
			await cleanup()
		}
	})

	await t.step('attempt to delete when only one mnemonic exists', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
			])

			await assertRejects(
				async () => {
					await mnemonicManager.deleteMnemonic(0)
				},
				Error,
				'Cannot delete the default mnemonic as it serves as a fallback',
			)
		} finally {
			await cleanup()
		}
	})

	await t.step('custom label for new mnemonic', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Custom label for new mnemonic',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('My Custom Label\n') // Custom label
					.toArray(),
				async fn() {
					mockKeystoreManager.setKeystore([])
					mockKeystoreManager.setActiveIndex(0)

					await mnemonicManager.addMnemonic()

					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore.length, 1)
					assertEquals(keystore[0].label, 'My Custom Label')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('generateMnemonic returns valid BIP-39 mnemonic', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			const generatedMnemonic = mnemonicManager.generateMnemonic()
			assertEquals(validateMnemonic(generatedMnemonic), true, 'Generated mnemonic should be valid')
			assertEquals(generatedMnemonic.split(' ').length, 12, 'Generated mnemonic should have 12 words')
		} finally {
			await cleanup()
		}
	})

	await t.step('importMnemonic rejects invalid BIP-39 words', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Import invalid mnemonic word',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.cursorDown
					.text('\n') // Select "Insert an existing mnemonic"
					.text('invalidword\n') // Invalid BIP-39 word
					.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager.addMnemonic()
						},
						Error,
						'Invalid word. Please enter a valid BIP-39 mnemonic word.'
					)
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('deleteMnemonic handles invalid index', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic },
				{ type: 'plaintext', label: 'Second Keystore', mnemonic }
			])
			mockKeystoreManager.setActiveIndex(0)

			// Test invalid negative index
			await assertRejects(
				async () => {
					await mnemonicManager.deleteMnemonic(-1)
				},
				Error,
				'Invalid mnemonic index'
			)

			// Test invalid large index
			await assertRejects(
				async () => {
					await mnemonicManager.deleteMnemonic(2)
				},
				Error,
				'Invalid mnemonic index'
			)
		} finally {
			await cleanup()
		}
	})

	await t.step('deleteMnemonic adjusts active index correctly', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			mockKeystoreManager.setKeystore([
				{ type: 'plaintext', label: 'Default Keystore', mnemonic },
				{ type: 'plaintext', label: 'Second Keystore', mnemonic },
				{ type: 'plaintext', label: 'Third Keystore', mnemonic }
			])

			// Test deleting mnemonic before active index
			mockKeystoreManager.setActiveIndex(2)
			await mnemonicManager.deleteMnemonic(1)
			assertEquals(mockKeystoreManager.getActiveIndex(), 1, 'Active index should be decremented when deleting before it')
			assertEquals(mockKeystoreManager.getKeystore().length, 2, 'Keystore should have one less entry')

			// Test deleting active mnemonic
			await mnemonicManager.deleteMnemonic(1)
			assertEquals(mockKeystoreManager.getActiveIndex(), 0, 'Active index should be set to 0 when deleting active mnemonic')
			assertEquals(mockKeystoreManager.getKeystore().length, 1, 'Keystore should have one less entry')
		} finally {
			await cleanup()
		}
	})

	await t.step('prompt for mnemonic returns generated phrase', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Prompt for generated mnemonic',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Generate a new mnemonic"
					.toArray(),
				async fn() {
					const result = await mnemonicManager['promptForMnemonic']()
					assertEquals(result.split(' ').length, 12, 'Generated mnemonic should have 12 words')
					assertEquals(validateMnemonic(result), true, 'Generated mnemonic should be valid')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('prompt for mnemonic handles import', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Prompt for imported mnemonic',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select "Insert an existing mnemonic"
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('test\n')
					.text('junk\n')
					.toArray(),
				async fn() {
					const result = await mnemonicManager['promptForMnemonic']()
					assertEquals(result, mnemonic, 'Imported mnemonic should match input')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic shows success message for plaintext storage', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic plaintext success message',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select "Store plaintext"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					await mnemonicManager.addMnemonic()
					assertEquals(Deno.stderr.toString(), 'Mnemonic stored in plaintext.')
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic shows success message for encrypted storage', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic encrypted success message',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					await mnemonicManager.addMnemonic()
					assertEquals(Deno.stderr.toString(), 'Mnemonic stored securely.')
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic handles custom label', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic with custom label',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('My Custom Label\n') // Enter custom label
					.toArray(),
				async fn() {
					await mnemonicManager.addMnemonic()
					const keystore = mockKeystoreManager.getKeystore()
					assertEquals(keystore[0].label, 'My Custom Label')
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic handles keystore write error', async () => {
		const { mnemonicManager, mockKeystoreManager, cleanup } = await createTestEnvironment()
		try {
			// Override writeKeystore to throw an error
			mockKeystoreManager.writeKeystore = async () => {
				throw new Error('Failed to write keystore')
			}

			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic write error',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager.addMnemonic()
						},
						Error,
						'Failed to write keystore'
					)
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic handles promptForMnemonic error', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			// Override promptForMnemonic to throw an error
			mnemonicManager['promptForMnemonic'] = async () => {
				throw new Error('Failed to prompt for mnemonic')
			}

			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic prompt error',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager.addMnemonic()
						},
						Error,
						'Failed to prompt for mnemonic'
					)
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic handles encryptMnemonic error', async () => {
		const { mnemonicManager, mockEncryptionService, cleanup } = await createTestEnvironment()
		try {
			// Override encryptMnemonic to throw an error
			mockEncryptionService.encryptMnemonic = async () => {
				throw new Error('Failed to encrypt mnemonic')
			}

			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic encryption error',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager.addMnemonic()
						},
						Error,
						'Failed to encrypt mnemonic'
					)
				}
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('addMnemonic handles label prompt error', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			// Save original Input.prompt
			const originalPrompt = Input.prompt
			// Override Input.prompt to throw an error for label input
			Input.prompt = async (options: any) => {
				if (options.message.includes('Enter a label')) {
					throw new Error('Failed to prompt for label')
				}
				return originalPrompt(options)
			}

			await snapshotTest({
				name: 'MnemonicManager - Add mnemonic label error',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager.addMnemonic()
						},
						Error,
						'Failed to prompt for label'
					)
				}
			})

			// Restore original Input.prompt
			Input.prompt = originalPrompt
		} finally {
			await cleanup()
		}
	})

	await t.step('promptForMnemonic handles Select.prompt error', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			// Save original Select.prompt
			const originalPrompt = Select.prompt
			// Override Select.prompt to throw an error
			Select.prompt = async () => {
				throw new Error('Failed to prompt for choice')
			}

			await snapshotTest({
				name: 'MnemonicManager - Prompt for mnemonic choice error',
				meta: import.meta,
				stdin: ansi.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager['promptForMnemonic']()
						},
						Error,
						'Failed to prompt for choice'
					)
				}
			})

			// Restore original Select.prompt
			Select.prompt = originalPrompt
		} finally {
			await cleanup()
		}
	})

	await t.step('importMnemonic handles Input.prompt error', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			// Save original Input.prompt
			const originalPrompt = Input.prompt
			// Override Input.prompt to throw an error
			Input.prompt = async () => {
				throw new Error('Failed to prompt for word')
			}

			await snapshotTest({
				name: 'MnemonicManager - Import mnemonic word error',
				meta: import.meta,
				stdin: ansi.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager['importMnemonic']()
						},
						Error,
						'Failed to prompt for word'
					)
				}
			})

			// Restore original Input.prompt
			Input.prompt = originalPrompt
		} finally {
			await cleanup()
		}
	})

	await t.step('importMnemonic handles validation error', async () => {
		const { mnemonicManager, cleanup } = await createTestEnvironment()
		try {
			await snapshotTest({
				name: 'MnemonicManager - Import mnemonic validation error',
				meta: import.meta,
				stdin: ansi
					.text('invalidword\n') // Invalid BIP-39 word
					.toArray(),
				async fn() {
					await assertRejects(
						async () => {
							await mnemonicManager['importMnemonic']()
						},
						Error,
						'Invalid word. Please enter a valid BIP-39 mnemonic word.'
					)
				}
			})
		} finally {
			await cleanup()
		}
	})
})
