import { assertEquals, assertRejects } from '@std/assert'
import { Wallet } from './wallet.ts'
import { join } from '@std/path'
import { KeystoreManager } from './keystore_manager.ts'
import { KeystoreEntry } from '../types.ts'
import { ansi } from 'cliffy/ansi'
import { snapshotTest } from 'cliffy/testing'

const mnemonic = 'test test test test test test test test test test test junk'

async function createTestEnvironment() {
	const tmpdir = await Deno.makeTempDir()
	return {
		tmpdir,
		cleanup: async () => {
			try {
				await Deno.remove(tmpdir, { recursive: true })
			} catch (_) {
				// Ignore if directory doesn't exist
			}
		}
	}
}

Deno.test('Wallet Tests', async (t) => {
	await t.step('initialize and read keystore', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			const wallet = new Wallet(tmpdir)
			await wallet.initializeKeystore()

			assertEquals(await wallet.getActiveMnemonic(), mnemonic)
			assertEquals(wallet.getActiveMnemonicLabel(), 'Default Keystore')
		} finally {
			await cleanup()
		}
	})

	await t.step('initialize keystore when keystore exists', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			const km = new KeystoreManager(tmpdir)
			const existingKeystore = {
				keystore: [
					{ type: 'plaintext', label: 'My Mnemonic', mnemonic: 'test test test' } as KeystoreEntry,
				],
				activeIndex: 0,
			}

			km.setKeystore(existingKeystore.keystore)
			km.setActiveIndex(existingKeystore.activeIndex)
			await km.writeKeystore()

			const wallet = new Wallet(tmpdir)
			await wallet.initializeKeystore()

			const activeMnemonic = await wallet.getActiveMnemonic()
			assertEquals(activeMnemonic, 'test test test')
		} finally {
			await cleanup()
		}
	})

	await t.step('add mnemonic', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			await snapshotTest({
				name: 'Wallet - Add mnemonic',
				meta: import.meta,
				stdin: ansi
					.text('\n') // Select "Store encrypted"
					.text('\n') // Select "Generate a new mnemonic"
					.text('\n') // Accept default label
					.toArray(),
				async fn() {
					const wallet = new Wallet(tmpdir)
					await wallet.initializeKeystore()
					await wallet.addMnemonic()

					const km = new KeystoreManager(tmpdir)
					const keystore = await km.readKeystore()
					assertEquals(keystore?.keystore.length, 2) // Default + new mnemonic
					assertEquals(keystore?.keystore[1].type, 'encoded')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('select active mnemonic', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			await snapshotTest({
				name: 'Wallet - Select active mnemonic',
				meta: import.meta,
				stdin: ansi
					.cursorDown
					.text('\n') // Select second mnemonic
					.toArray(),
				async fn() {
					const wallet = new Wallet(tmpdir)
					await wallet.initializeKeystore()

					// Add a second mnemonic
					const km = new KeystoreManager(tmpdir)
					km.setKeystore([
						{ type: 'plaintext', label: 'Default Keystore', mnemonic },
						{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2 test2 test2' },
					])
					await km.writeKeystore()

					await wallet.selectActiveMnemonic()
					assertEquals(wallet.getActiveMnemonicLabel(), 'Second Mnemonic')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('delete mnemonic', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			await snapshotTest({
				name: 'Wallet - Delete mnemonic',
				meta: import.meta,
				stdin: ansi
					.text('1\n') // Select second mnemonic
					.text('yes\n') // Confirm deletion
					.toArray(),
				async fn() {
					const wallet = new Wallet(tmpdir)
					await wallet.initializeKeystore()

					// Add a second mnemonic
					const km = new KeystoreManager(tmpdir)
					km.setKeystore([
						{ type: 'plaintext', label: 'Default Keystore', mnemonic },
						{ type: 'plaintext', label: 'Second Mnemonic', mnemonic: 'test2 test2 test2' },
					])
					await km.writeKeystore()

					await wallet.deleteMnemonic()

					const keystore = await km.readKeystore()
					assertEquals(keystore?.keystore.length, 1)
					assertEquals(keystore?.keystore[0].label, 'Default Keystore')
				},
			})
		} finally {
			await cleanup()
		}
	})

	await t.step('generate private key', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			const wallet = new Wallet(tmpdir)
			await wallet.initializeKeystore()

			const privateKey = wallet.generatePrivateKey()
			assertEquals(privateKey.startsWith('0x'), true)
			assertEquals(privateKey.length, 66) // 64 hex characters + "0x"
		} finally {
			await cleanup()
		}
	})

	await t.step('derive private keys by path and index', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			const wallet = new Wallet(tmpdir)
			await wallet.initializeKeystore()

			// Test custom derivation path
			const customKey = await wallet.privateKeyByDerivationPath("m/44'/60'/0'/0/0")
			assertEquals(customKey.startsWith('0x'), true)

			// Test eSpace key derivation
			const espaceKey = await wallet.espacePrivateKey(0)
			assertEquals(espaceKey.startsWith('0x'), true)

			// Test Core key derivation
			const coreKey = await wallet.corePrivateKey(0)
			assertEquals(coreKey.startsWith('0x'), true)

			// Different paths should yield different keys
			assertEquals(espaceKey !== coreKey, true)
		} finally {
			await cleanup()
		}
	})

	await t.step('derive addresses', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()
		try {
			const wallet = new Wallet(tmpdir)
			await wallet.initializeKeystore()

			const espaceAddress = await wallet.espaceAddress(0)
			const coreAddress = await wallet.coreAddress(0)

			// eSpace address should be a hex address
			assertEquals(espaceAddress.startsWith('0x'), true)
			assertEquals(espaceAddress.length, 42)

			// Core address should be a base32 address
			assertEquals(coreAddress.startsWith('net2029:'), true)
			assertEquals(coreAddress.length > 42, true)

			// Addresses should be different
			assertEquals(espaceAddress !== coreAddress, true)
		} finally {
			await cleanup()
		}
	})

	await t.step('error handling for invalid mnemonic', async () => {
		const { tmpdir, cleanup } = await createTestEnvironment()

		try {
			const wallet = new Wallet(tmpdir)
			await wallet.initializeKeystore()

			// Set an invalid mnemonic
			const km = new KeystoreManager(tmpdir)
			km.setKeystore([
				{ type: 'plaintext', label: 'Invalid', mnemonic: 'invalid mnemonic phrase that is definitely wrong' },
			])
			km.setActiveIndex(0)
			await km.writeKeystore()

			// Create a new wallet instance to use the invalid keystore
			const invalidWallet = new Wallet(tmpdir)
			await invalidWallet.initializeKeystore()

			// Deriving a key from invalid mnemonic should fail
			await assertRejects(
				async () => await invalidWallet.privateKeyByDerivationPath("m/44'/60'/0'/0/0"),
				Error,
				'Invalid mnemonic',
			)
		} finally {
			await cleanup()
		}
	})
})
