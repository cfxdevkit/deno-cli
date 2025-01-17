import { KeystoreManager } from './keystore_manager.ts'
import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { ensureFileSync } from '@std/fs'
import { KeystoreEntry } from '../types.ts'

Deno.test('KeystoreManager - initialize and read keystore', async () => {
	const tmpdir = await Deno.makeTempDir()
	const tempKeystorePath = join(tmpdir, '.devkit.keystore.json')
	// Mock Deno.env to set HOME to current directory
	const originalEnv = Deno.env.get
	Deno.env.get = (key: string) => (key === 'HOME' ? tmpdir : originalEnv(key))

	try {
		// Ensure the test keystore file exists
		ensureFileSync(tempKeystorePath)

		// Initialize KeystoreManager
		const manager = new KeystoreManager()
		assertEquals(manager['keystorePath'], tempKeystorePath)

		// Read empty keystore
		const keystore = await manager.readKeystore()
		assertEquals(keystore, null)

		// Write to keystore
		const item: KeystoreEntry = { type: 'plaintext', label: 'Test Key', mnemonic: 'test mnemonic' }
		manager.setKeystore([item])
		manager.setActiveIndex(0)
		await manager.writeKeystore()

		// Read updated keystore
		const updatedKeystore = await manager.readKeystore()
		assertEquals(updatedKeystore?.keystore.length, 1)
		assertEquals(updatedKeystore?.keystore[0].label, 'Test Key')
		assertEquals(updatedKeystore?.activeIndex, 0)
	} finally {
		// Clean up test file and restore environment
		await Deno.remove(tempKeystorePath)
		Deno.env.get = originalEnv
	}
})

Deno.test('KeystoreManager - set and get keystore and active index', () => {
	const manager = new KeystoreManager()

	// Set keystore entries
	const mockKeystore = [
		{ type: 'plaintext', label: 'Key 1', mnemonic: 'mnemonic1' } as KeystoreEntry,
		{ type: 'plaintext', label: 'Key 2', mnemonic: 'mnemonic2' } as KeystoreEntry,
	]
	manager.setKeystore(mockKeystore)

	// Get keystore entries
	const retrievedKeystore = manager.getKeystore()
	assertEquals(retrievedKeystore.length, 2)
	assertEquals(retrievedKeystore[0].label, 'Key 1')

	// Set and get active index
	manager.setActiveIndex(1)
	assertEquals(manager.getActiveIndex(), 1)

	// Set active index to null and ensure default fallback
	manager.setActiveIndex(null)
	assertEquals(manager.getActiveIndex(), 0)
})

Deno.test('KeystoreManager - handle non-existent keystore file', async () => {
	// Initialize KeystoreManager
	const manager = new KeystoreManager()
	manager.setKeystorePath('.wrong.path')
	// Read non-existent keystore
	const keystore = await manager.readKeystore()
	assertEquals(keystore, null)
})

Deno.test('KeystoreManager - handle keystore modifications', async () => {
	const tmpdir = await Deno.makeTempDir()
	const tempKeystorePath = join(tmpdir, '.devkit.keystore.json')
	const originalEnv = Deno.env.get
	Deno.env.get = (key: string) => (key === 'HOME' ? tmpdir : originalEnv(key))

	try {
		const manager = new KeystoreManager()
		manager.setKeystorePath(tempKeystorePath)

		// Add entries
		const entries = [
			{ type: 'plaintext', label: 'Key 1', mnemonic: 'mnemonic1' },
			{ type: 'plaintext', label: 'Key 2', mnemonic: 'mnemonic2' },
			{ type: 'plaintext', label: 'Key 3', mnemonic: 'mnemonic3' },
		] as KeystoreEntry[]

		manager.setKeystore(entries)
		manager.setActiveIndex(2)
		await manager.writeKeystore()

		// Remove middle entry
		const keystore = manager.getKeystore()
		keystore.splice(1, 1)

		// Verify length and active index behavior
		assertEquals(keystore.length, 2)
		assertEquals(manager.getActiveIndex(), 2)

		// Write and read back
		await manager.writeKeystore()
		const readKeystore = await manager.readKeystore()
		assertEquals(readKeystore?.keystore.length, 2)
		assertEquals(readKeystore?.activeIndex, 2)
	} finally {
		await Deno.remove(tempKeystorePath)
		Deno.env.get = originalEnv
	}
})
