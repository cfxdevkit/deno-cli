import { assertEquals, assertRejects } from '@std/assert'
import { snapshotTest } from 'cliffy/testing'
import { ansi } from 'cliffy/ansi'
import { EncryptionService } from './encryption_service.ts'

Deno.test('EncryptionService Tests', async (t) => {
	await t.step('encrypt and decrypt mnemonic successfully', async () => {
		await snapshotTest({
			name: 'EncryptionService - encrypt and decrypt mnemonic successfully',
			meta: import.meta,
			stdin: ansi
				.text('password\n')
				.text('password\n')
				.toArray(),
			async fn() {
				const encryptionService = new EncryptionService()
				const mnemonic = 'test test test test test test test test test test test junk'
				encryptionService.getRandomValues = (typedArray: Uint8Array) => {
					return typedArray
				}
				const encryptedMnemonic = await encryptionService.encryptMnemonic(mnemonic)

				assertEquals(
					encryptedMnemonic,
					'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANtJQA7N38hVEuTdGw+i+TKMDYWq4lJ7+eVgQKvL3RPe8wniDZH8IBhbyX/BlfgviIBIOHEAswZdqpCJUruE5Nda3rF8xMumtK6jjg==',
				)
				assertEquals(mnemonic, await encryptionService.decryptMnemonic(encryptedMnemonic))
			},
		})
	})

	await t.step('decryption fails after maximum attempts', async () => {
		const service = new EncryptionService()
		const mnemonic = 'test test test test test test test test test test test junk'
		
		// Mock deriveKeyFromPassword to return a consistent key for encryption
		const originalDerive = service['deriveKeyFromPassword']
		service['deriveKeyFromPassword'] = async () => {
			// Create a 32-byte (256-bit) key for AES-GCM
			const keyData = new Uint8Array(32).fill(1)
			return await crypto.subtle.importKey(
				'raw',
				keyData,
				{ name: 'AES-GCM' },
				false,
				['encrypt', 'decrypt']
			)
		}
		
		const encrypted = await service.encryptMnemonic(mnemonic)
		
		// Restore original for decryption testing
		service['deriveKeyFromPassword'] = originalDerive
		
		await snapshotTest({
			name: 'EncryptionService - Decryption fails after max attempts',
			meta: import.meta,
			stdin: ansi
				.text('wrong1\n')  // First wrong attempt
				.text('wrong2\n')  // Second wrong attempt
				.text('wrong3\n')  // Third wrong attempt
				.toArray(),
			async fn() {
				await assertRejects(
					async () => {
						await service.decryptMnemonic(encrypted)
					},
					Error,
					'Maximum decryption attempts reached.'
				)
			}
		})
	})

	await t.step('deriveKeyFromPassword generates different keys for different salts', async () => {
		await snapshotTest({
			name: 'EncryptionService - deriveKeyFromPassword with different salts',
			meta: import.meta,
			stdin: ansi
				.text('password\n')
				.text('password\n')
				.toArray(),
			async fn() {
				const encryptionService = new EncryptionService()
				const salt1 = new Uint8Array(16).fill(1)
				const salt2 = new Uint8Array(16).fill(2)

				const key1 = await encryptionService.deriveKeyFromPassword('Test reason', salt1)
				const key2 = await encryptionService.deriveKeyFromPassword('Test reason', salt2)

				const exportedKey1 = await crypto.subtle.exportKey('raw', key1)
				const exportedKey2 = await crypto.subtle.exportKey('raw', key2)

				assertEquals(exportedKey1.byteLength, 32) // Check key length is 256 bits
				assertEquals(exportedKey2.byteLength, 32)
				assertEquals(new Uint8Array(exportedKey1).toString() !== new Uint8Array(exportedKey2).toString(), true)
			}
		})
	})

	await t.step('getRandomValues generates different values on each call', () => {
		const encryptionService = new EncryptionService()
		const array1 = new Uint8Array(16)
		const array2 = new Uint8Array(16)

		encryptionService.getRandomValues(array1)
		encryptionService.getRandomValues(array2)

		assertEquals(array1.toString() !== array2.toString(), true)
	})

	await t.step('decryption with corrupted data fails', async () => {
		await snapshotTest({
			name: 'EncryptionService - decryption with corrupted data',
			meta: import.meta,
			stdin: ansi
				.text('password\n')
				.text('password\n')
				.text('password\n')
				.toArray(),
			async fn() {
				const encryptionService = new EncryptionService()
				const corruptedData = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

				await assertRejects(
					async () => {
						await encryptionService.decryptMnemonic(corruptedData)
					},
					Error,
					'Maximum decryption attempts reached.'
				)
			}
		})
	})

	await t.step('encryption with empty mnemonic fails', async () => {
		await snapshotTest({
			name: 'EncryptionService - encryption with empty mnemonic',
			meta: import.meta,
			stdin: ansi
				.text('password\n')
				.toArray(),
			async fn() {
				const encryptionService = new EncryptionService()
				await assertRejects(
					async () => {
						await encryptionService.encryptMnemonic('')
					},
					Error,
					'Mnemonic cannot be empty'
				)
			}
		})
	})

	await t.step('decryption with invalid base64 fails', async () => {
		const encryptionService = new EncryptionService()
		await assertRejects(
			async () => {
				await encryptionService.decryptMnemonic('invalid-base64!')
			},
			Error,
			'Failed to decode base64'
		)
	})
})
