/**
 * Server management module for handling the development node
 * @module Server
 */

import { privateKeyToAccount } from 'cive/accounts'
import { CliSpinner } from './spinner.ts'
import { Wallet } from './wallet/wallet.ts'
import { Config, createServer } from '@xcfx/node'
import { coreClient } from './clients/cive.ts'

/**
 * Manages the development node server lifecycle and configuration
 * @class ServerManager
 */
export class ServerManager {
	/** The server instance */
	private server?: { start: () => Promise<void>; stop: () => void }
	/** CLI spinner for visual feedback */
	private cs: CliSpinner
	/** Server configuration */
	private cfg!: Config
	/** Miner wallet for the node */
	private minerWallet: coreClient | undefined

	/**
	 * Creates a new server manager instance
	 * @constructor
	 * @param {Wallet} wallet - Wallet instance for key management
	 * @param {Config} config - Server configuration
	 */
	constructor(private wallet: Wallet, private config: Config) {
		this.cs = new CliSpinner()
	}

	/**
	 * Initializes the blockchain with necessary accounts and configurations
	 * @private
	 * @throws {Error} If chain initialization fails
	 */
	private async initializeChain() {
		try {
			if (this.config.chainId) {
				const miner = this.wallet.generatePrivateKey()
				const miner_account = privateKeyToAccount(
					miner,
					{ networkId: this.config.chainId },
				)
				this.config.miningAuthor = miner_account.address

				this.config.genesisSecrets = await Promise.all(
					Array.from({ length: 10 }, (_, i) => this.wallet.corePrivateKey(i)),
				).catch((error) => {
					throw new Error(`Failed to generate core private keys: ${error.message}`)
				}) as `0x${string}`[]
				this.config.genesisSecrets.push(miner)
				this.config.genesisEvmSecrets = await Promise.all(
					Array.from({ length: 10 }, (_, i) => this.wallet.espacePrivateKey(i)),
				).catch((error) => {
					throw new Error(`Failed to generate evm private keys: ${error.message}`)
				}) as `0x${string}`[]
				this.minerWallet = new coreClient(this.config, this.config.genesisSecrets.length - 1)
			} else {
				throw new Error('Chain ID is not set')
			}
		} catch (error) {
			console.error('Failed to initialize chain:', error)
			throw error
		}
	}

	/**
	 * Starts the Conflux Node server
	 * @async
	 * @throws {Error} If server fails to start
	 */
	public async startServer() {
		this.cs.start('Starting the Conflux Node...')
		await this.initializeChain()
		this.server = await createServer(this.config)
		await this.server.start()
		this.cs.succeed('Node started successfully!')
	}

	/**
	 * Stops the Conflux Node server
	 */
	public stopServer() {
		this.cs.start('Shutting down the Conflux Node...')
		this.server?.stop()
		this.cs.succeed('Node terminated successfully!')
	}

	/**
	 * Gets the current server configuration
	 * @returns {Config} The current configuration
	 */
	public getConfig(): Config {
		return this.config
	}

	/**
	 * Gets the miner wallet instance
	 * @returns {coreClient | undefined} The miner wallet instance
	 */
	public getMinerWallet(): coreClient | undefined {
		return this.minerWallet
	}
}
