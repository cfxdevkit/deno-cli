import { assertEquals, assertRejects } from '@std/assert'
import { ansi } from 'cliffy/ansi'
import { snapshotTest } from 'cliffy/testing'
import { EncryptionService } from './encryption_service.ts'
import { MnemonicManager } from './mnemonic_manager.ts'
import { IKeystoreManager } from './keystore_manager.ts'
import { KeystoreEntry, KeystoreFile } from '../types.ts'

export class MockKeystoreManager implements IKeystoreManager {
	public keystorePath: string = '.mock_keystore.json' // Change to "protected"
	public keystore: KeystoreEntry[] = []
	public activeIndex: number | null = 0
	// deno-lint-ignore require-await
	async readKeystore(): Promise<KeystoreFile | null> {
		console.log('Mock readKeystore called.')
		return { keystore: this.keystore, activeIndex: this.activeIndex }
	}
	// deno-lint-ignore require-await
	async writeKeystore(): Promise<void> {
		console.log('Mock writeKeystore called.')
	}

	getKeystore(): KeystoreEntry[] {
		return this.keystore
	}

	setKeystore(keystore: KeystoreEntry[]): void {
		this.keystore = keystore
	}

	getActiveIndex(): number {
		return this.activeIndex || 0
	}

	setActiveIndex(index: number | null): void {
		this.activeIndex = index
	}

	setKeystorePath(keystorePath: string): void {
		this.keystorePath = keystorePath
	}
}

const mnemonic = 'test test test test test test test test test test test junk'
const mockKeystoreManager = new MockKeystoreManager()
const mockEncryptionService = new EncryptionService()
mockEncryptionService.getRandomValues = (typedArray: Uint8Array) => {
	return typedArray
}
// deno-lint-ignore require-await
mockEncryptionService.encryptMnemonic = async (_mnemonic) => `encrypted:${mnemonic}`

const mnemonicManager = new MnemonicManager(mockKeystoreManager, mockEncryptionService)
mnemonicManager.generateMnemonic = () => mnemonic

// Add a helper function to reset the mock keystore
function resetMockKeystore() {
	mockKeystoreManager.setKeystore([])
	mockKeystoreManager.setActiveIndex(0)
}

await snapshotTest({
	name: 'MnemonicManager - Add generated mnemonic with encryption',
	meta: import.meta,
	stdin: ansi
		.text('\n') // Select "Store encrypted"
		.text('\n') // Select "Generate a new mnemonic"
		.text('\n') // Select "accept default label"
		//   .text("\n") // Input "encryption password (mock don't needs password"
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
		console.log(keystore)
		assertEquals(keystore.length, 1)
		assertEquals(keystore[0].type, 'plaintext')
		assertEquals(keystore[0].mnemonic.split(' ').length, 12)
		assertEquals(keystore[0].label, 'Mnemonic 1')
	},
})

// Test: Import mnemonic and store as plaintext
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

// Test: Import mnemonic and store as encrypted
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

// // Test: Error handling for invalid mnemonic input
// await snapshotTest({
//     name: "MnemonicManager - Error on invalid mnemonic input",
//     meta: import.meta,
//     stdin: ansi
// 	.cursorDown
// 	.text("\n") // Select "Store plaintext"
// 	.cursorDown
// 	.text("\n") // Select "Insert an existing mnemonic"
// 	// .text("invalidword\n")
// 	// .eraseLine
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("test\n")
// 	.text("junk\n")
// 	.text("\n") // Accept default label
// 	.toArray(),
// async fn() {
//         mockKeystoreManager.setKeystore([]);
//         mockKeystoreManager.setActiveIndex(0);
// 		console.log(await mnemonicManager.addMnemonic())
//         // await assertRejects(() => mnemonicManager.addMnemonic(), Error, "Invalid word. Please enter a valid BIP-39 mnemonic word.");
//         assertEquals(mockKeystoreManager.getKeystore().length, 0);
//     },
// });

// Test: Multiple mnemonics stored
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

// Add new tests for delete functionality
await snapshotTest({
	name: 'MnemonicManager - Cannot delete default mnemonic',
	meta: import.meta,
	async fn() {
		resetMockKeystore()
		mockKeystoreManager.setKeystore([
			{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic }
		])

		await assertRejects(
			async () => {
				await mnemonicManager.deleteMnemonic(0)
			},
			Error,
			'Cannot delete the default mnemonic as it serves as a fallback'
		)
	}
})

await snapshotTest({
	name: 'MnemonicManager - Delete non-default mnemonic',
	meta: import.meta,
	async fn() {
		resetMockKeystore()
		mockKeystoreManager.setKeystore([
			{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
			{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2 test2 test2' }
		])
		mockKeystoreManager.setActiveIndex(1)

		await mnemonicManager.deleteMnemonic(1)

		const keystore = mockKeystoreManager.getKeystore()
		assertEquals(keystore.length, 1)
		assertEquals(keystore[0].label, 'Default Keystore')
		assertEquals(mockKeystoreManager.getActiveIndex(), 0)
	}
})

await snapshotTest({
	name: 'MnemonicManager - Delete active mnemonic updates active index',
	meta: import.meta,
	async fn() {
		resetMockKeystore()
		mockKeystoreManager.setKeystore([
			{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
			{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2' },
			{ type: 'plaintext', label: 'Third Mnemonic', mnemonic: 'test3' }
		])
		mockKeystoreManager.setActiveIndex(2)

		await mnemonicManager.deleteMnemonic(2)

		assertEquals(mockKeystoreManager.getActiveIndex(), 0)
		assertEquals(mockKeystoreManager.getKeystore().length, 2)
	}
})

await snapshotTest({
	name: 'MnemonicManager - Delete mnemonic updates subsequent active index',
	meta: import.meta,
	async fn() {
		resetMockKeystore()
		mockKeystoreManager.setKeystore([
			{ type: 'plaintext', label: 'Default Keystore', mnemonic: mnemonic },
			{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2' },
			{ type: 'plaintext', label: 'Third Mnemonic', mnemonic: 'test3' }
		])
		mockKeystoreManager.setActiveIndex(2)

		await mnemonicManager.deleteMnemonic(1)

		assertEquals(mockKeystoreManager.getActiveIndex(), 1)
		assertEquals(mockKeystoreManager.getKeystore().length, 2)
	}
})
