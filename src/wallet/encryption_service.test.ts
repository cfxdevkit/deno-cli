import { snapshotTest } from 'cliffy/testing'
import { ansi } from 'cliffy/ansi'
import { EncryptionService } from './encryption_service.ts'

import { assertEquals } from '@std/assert'
Deno.test('EncryptionService - encrypt and decrypt mnemonic successfully', async () => {
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
