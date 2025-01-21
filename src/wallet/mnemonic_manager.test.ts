import { assertEquals, assertRejects } from '@std/assert'
import { ansi } from 'cliffy/ansi'
import { snapshotTest } from 'cliffy/testing'
import { EncryptionService } from './encryption_service.ts'
import { MnemonicManager } from './mnemonic_manager.ts'
import { KeystoreManager } from './keystore_manager.ts'
import { KeystoreEntry, KeystoreFile } from '../types.ts'
import { join } from '@std/path'
import { ensureFileSync } from '@std/fs'

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
	mnemonicManager.generateMnemonic = () => mnemonic

	return {
		tmpdir,
		mnemonicManager,
		mockKeystoreManager,
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
					assertEquals(keystore[0].mnemonic, `encrypted:${mnemonic}`)
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
					assertEquals(keystore[0].mnemonic.split(' ').length, 12)
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
})
