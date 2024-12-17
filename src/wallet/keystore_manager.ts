import { ensureFileSync } from '@std/fs'
import { join } from '@std/path'
import { KeystoreEntry, KeystoreFile } from '../types.ts'

export interface IKeystoreManager {
	readKeystore(): Promise<KeystoreFile | null>
	writeKeystore(): Promise<void>
	getKeystore(): KeystoreEntry[]
	setKeystore(keystore: KeystoreEntry[]): void
	getActiveIndex(): number
	setActiveIndex(index: number | null): void
}

export class KeystoreManager implements IKeystoreManager {
	public keystorePath: string
	public keystore: KeystoreEntry[] = []
	public activeIndex: number | null = 0

	constructor() {
		this.keystorePath = join(Deno.env.get('HOME') || '', '.devkit.keystore.json')
		ensureFileSync(this.keystorePath)
	}

	async readKeystore(): Promise<KeystoreFile | null> {
		try {
			const data = await Deno.readTextFile(this.keystorePath)
			return data.trim() ? JSON.parse(data) : null
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) return null
			throw error
		}
	}

	async writeKeystore(): Promise<void> {
		const data: KeystoreFile = { keystore: this.keystore, activeIndex: this.activeIndex }
		await Deno.writeTextFile(this.keystorePath, JSON.stringify(data, null, 2))
	}

	getKeystore() {
		return this.keystore
	}

	setKeystore(keystore: KeystoreEntry[]) {
		this.keystore = keystore
	}

	setKeystorePath(keystore_path: string) {
		this.keystorePath = keystore_path
	}

	setActiveIndex(index: number | null) {
		this.activeIndex = index
	}

	getActiveIndex(): number {
		return this.activeIndex || 0
	}
}
