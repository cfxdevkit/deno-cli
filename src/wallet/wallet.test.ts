import { assertEquals } from '@std/assert'
import { Wallet } from './wallet.ts'
import { join } from '@std/path'
import { KeystoreManager } from './keystore_manager.ts'
import { KeystoreEntry } from '../types.ts'
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

Deno.test('KeystoreManager - initialize and read keystore', async () => {
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

Deno.test('KeystoreManager - Initialize keystore when keystore exists', async () => {
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

// // // Test: Add a mnemonic
// // await snapshotTest({
// //     name: "Wallet - Add mnemonic",
// //     meta: import.meta,
// //     stdin: ansi.text("\n") // Simulate prompts for adding a mnemonic
// //         .cursorDown()
// //         .text("\n") // Choose "Store plaintext"
// //         .toArray(),
// //     async fn() {
// //         mockKeystoreManager.setKeystore([]);
// //         mockKeystoreManager.setActiveIndex(null);

// //         await wallet.addMnemonic();

// //         const keystore = mockKeystoreManager.getKeystore();
// //         assertEquals(keystore.length, 1);
// //         assertEquals(keystore[0].label, "Mnemonic 1");
// //     },
// // });

// // // Test: Select active mnemonic
// // await snapshotTest({
// //     name: "Wallet - Select active mnemonic",
// //     meta: import.meta,
// //     stdin: ansi
// //         .cursorDown()
// //         .text("\n") // Select second mnemonic in the list
// //         .toArray(),
// //     async fn() {
// //         mockKeystoreManager.setKeystore([
// //             { type: 'plaintext', label: 'Mnemonic 1', mnemonic: 'mnemonic 1' },
// //             { type: 'plaintext', label: 'Mnemonic 2', mnemonic: 'mnemonic 2' },
// //         ]);
// //         mockKeystoreManager.setActiveIndex(0);

// //         await wallet.selectActiveMnemonic();

// //         assertEquals(mockKeystoreManager.getActiveIndex(), 1);
// //     },
// // });

// // // Test: Generate private key
// // await snapshotTest({
// //     name: "Wallet - Generate private key",
// //     meta: import.meta,
// //     stdin: ansi.toArray(),
// //     async fn() {
// //         const privateKey = wallet.generatePrivateKey();
// //         assertEquals(privateKey.startsWith("0x"), true);
// //         assertEquals(privateKey.length, 66); // 64 hex characters + "0x"
// //     },
// // });

// // // Test: Retrieve active mnemonic label
// // await snapshotTest({
// //     name: "Wallet - Get active mnemonic label",
// //     meta: import.meta,
// //     stdin: ansi.toArray(),
// //     async fn() {
// //         mockKeystoreManager.setKeystore([
// //             { type: 'plaintext', label: 'Mnemonic 1', mnemonic: 'test mnemonic' },
// //         ]);
// //         mockKeystoreManager.setActiveIndex(0);

// //         const label = wallet.getActiveMnemonicLabel();
// //         assertEquals(label, 'Mnemonic 1');
// //     },
// // });

// // // Test: Generate private key by derivation path
// // await snapshotTest({
// //     name: "Wallet - Generate private key by derivation path",
// //     meta: import.meta,
// //     stdin: ansi.toArray(),
// //     async fn() {
// //         mockKeystoreManager.setKeystore([
// //             { type: 'plaintext', label: 'Mnemonic 1', mnemonic: 'test test test' },
// //         ]);
// //         mockKeystoreManager.setActiveIndex(0);

// //         await wallet.initializeKeystore();
// //         const privateKey = wallet.privateKeyByDerivationPath("m/44'/60'/0'/0/0");
// //         assertEquals(privateKey.startsWith("0x"), true);
// //     },
// // });
