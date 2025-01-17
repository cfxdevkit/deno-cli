import { privateKeyToAccount } from 'cive/accounts'
import { CliSpinner } from './spinner.ts'
import { Wallet } from './wallet/wallet.ts'
import { Config, createServer } from '@xcfx/node'
import { coreClient } from './clients/cive.ts'

export class ServerManager {
	private server?: { start: () => Promise<void>; stop: () => void }
	private cs: CliSpinner
	private cfg!: Config
	private minerWallet: coreClient | undefined

	constructor(wallet: Wallet, config: Config) {
		this.cs = new CliSpinner()
		this.cfg = config
		const miner = wallet.generatePrivateKey()
		if (this.cfg.chainId) {
			this.initializeChain(wallet, miner).catch(console.error)
		}
	}

	private async initializeChain(wallet: Wallet, miner: `0x${string}`) {
		try {
			const miner_account = privateKeyToAccount(
				miner,
				{ networkId: this.cfg.chainId },
			)
			this.cfg.miningAuthor = miner_account.address

			this.cfg.genesisSecrets = await Promise.all(
				Array.from({ length: 10 }, (_, i) => wallet.corePrivateKey(i)),
			).catch((error) => {
				throw new Error(`Failed to generate core private keys: ${error.message}`)
			}) as `0x${string}`[]
			this.cfg.genesisSecrets.push(miner)

			this.cfg.genesisEvmSecrets = await Promise.all(
				Array.from({ length: 10 }, (_, i) => wallet.espacePrivateKey(i)),
			).catch((error) => {
				throw new Error(`Failed to generate evm private keys: ${error.message}`)
			}) as `0x${string}`[]

			this.minerWallet = new coreClient(this.cfg, this.cfg.genesisSecrets.length - 1)
		} catch (error) {
			console.error('Failed to initialize chain:', error)
			throw error // Re-throw to be caught by the constructor's catch
		}
	}

	public async startServer() {
		this.cs.start('Starting the Conflux Node...')
		this.server = await createServer(this.cfg)
		await this.server.start()
		this.cs.succeed('Node started successfully!')
	}

	public stopServer() {
		this.cs.start('Shutting down the Conflux Node...')
		this.server?.stop()
		this.cs.succeed('Node terminated successfully!')
	}

	public getConfig(): Config {
		return this.cfg
	}

	public getMinerWallet(): coreClient | undefined {
		return this.minerWallet
	}
}
