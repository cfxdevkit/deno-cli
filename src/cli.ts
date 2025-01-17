import { Command } from 'cliffy/command'
import { Wallet } from './wallet/wallet.ts'
import { KeyCode, parse } from 'cliffy/keycode'
import { ServerManager } from './server.ts'
import { Config } from '@xcfx/node'
import { TransactionMonitor } from './clients/node.ts'
import { ensureFileSync } from '@std/fs'
import { join } from '@std/path'
import { Input, Select } from 'cliffy/prompt'
import { Address } from 'cive'
import { isAddress as isEspaceAddress } from 'viem'
import { isAddress as isCoreAddress } from 'cive/utils'
import denojson from '../deno.json' with { type: 'json' }

const CONFIG_FILE = join(Deno.env.get('HOME') || '', '.devkit.config.json')

// Main CLI Class
export class DevkitCLI {
	private program: Command
	private wallet: Wallet
	private config: Config | undefined
	private txScan: TransactionMonitor
	private server: ServerManager | undefined

	constructor() {
		ensureFileSync(CONFIG_FILE)
		this.wallet = new Wallet()
		this.txScan = new TransactionMonitor()

		this.program = new Command()
			.name('devkit')
			.version(denojson.version) // Replace with dynamic version if needed
			.description('CLI tool for Conflux development tasks.')
			.action(() => {
				this.program.showHelp()
			})

		this.initializeCommands()
	}

	private async loadConfig(): Promise<Config> {
		try {
			const data = await Deno.readTextFile(CONFIG_FILE)
			return data.trim() ? JSON.parse(data) : this.defaultConfig()
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) {
				return this.defaultConfig()
			}
			throw error
		}
	}

	private async saveConfig(): Promise<void> {
		await Deno.writeTextFile(CONFIG_FILE, JSON.stringify(this.config, null, 2))
	}

	private defaultConfig(): Config {
		const defaultConfig: Config = {
			devBlockIntervalMs: 500,
			jsonrpcHttpPort: 12537,
			jsonrpcWsPort: 12535,
			jsonrpcHttpEthPort: 8545,
			jsonrpcWsEthPort: 8546,
			chainId: 2029,
			evmChainId: 2030,
		}
		this.config = defaultConfig
		this.saveConfig()
		return defaultConfig
	}

	private initializeCommands() {
		this.program
			.command('start')
			.description('Start the development node')
			.action(async () => {
				this.config = await this.loadConfig()
				await this.wallet.initializeKeystore()
				this.server = new ServerManager(this.wallet, this.config)
				this.config = this.server.getConfig()

				try {
					console.clear()
					await this.server.startServer()
					const cfg = this.server.getConfig()
					this.txScan.initializeClients(cfg)
					this.txScan.setFooter(`${this.wallet.getActiveMnemonicLabel()} | [F]aucet [B]alance [Q]uit`)

					this.txScan.watchTransactions()

					await this.waitForExit()
				} catch (error) {
					if (error instanceof Error) {
						console.error(error.message || 'An error occurred')
					} else {
						console.error('An unexpected error occurred:', error)
					}
				} finally {
					this.txScan.unwatch?.()
					this.server.stopServer()
				}
			})

		const walletCommand = new Command()
			.name('wallet')
			.description('Configure a local HDWallet')
			.action(() => {
				walletCommand.showHelp()
			})

		walletCommand
			.command('add')
			.description('Generate or insert a new mnemonic in the keystore')
			.action(async () => {
				await this.wallet.initializeKeystore()
				this.wallet.addMnemonic()
			})

		walletCommand
			.command('delete')
			.description('Delete a mnemonic from the keystore (except default)')
			.action(async () => {
				await this.wallet.initializeKeystore()
				await this.wallet.deleteMnemonic()
			})

		walletCommand
			.command('select')
			.description('Select the currently active mnemonic')
			.action(async () => {
				await this.wallet.initializeKeystore()
				await this.wallet.selectActiveMnemonic()
			})

		walletCommand
			.command('show')
			.description('Print to screen the currently active mnemonic')
			.action(async () => {
				await this.wallet.initializeKeystore()
				console.log(await this.wallet.getActiveMnemonic())
			})

		walletCommand
			.command('private-key')
			.description('Manage private keys')
			.option('--derivation-path [path:string]', 'Derivation path for the private key')
			.option('--espace [espace:boolean]', 'Use the eSpace network', { default: true })
			.option('--core [core:boolean]', 'Use the core network')
			.option('--index [index:number]', 'Index for key derivation', { default: 0 })
			.action(async ({ espace, core, index, derivationPath }) => {
				await this.wallet.initializeKeystore()

				if (core) {
					console.log(await this.wallet.corePrivateKey(index as number))
				} else if (espace) {
					console.log(await this.wallet.espacePrivateKey(index as number))
				} else if (derivationPath) {
					console.log(await this.wallet.privateKeyByDerivationPath(derivationPath as string))
				} else {
					console.log('Invalid options.')
				}
			})

		this.program.command('wallet', walletCommand)

		const configCommand = new Command()
			.name('config')
			.description('Manage configuration settings')
			.action(() => {
				configCommand.showHelp()
			})

		configCommand
			.command('view')
			.description('View current configuration')
			.action(async () => {
				if (!this.config) {
					this.config = await this.loadConfig()
				}
				console.log(JSON.stringify(this.config, null, 2))
			})

		configCommand
			.command('update')
			.description('Update configuration')
			.action(async () => {
				if (!this.config) {
					this.config = await this.loadConfig()
				}
				this.config = await this.showMenu(this.config)
				this.saveConfig()
			})

		this.program.command('config', configCommand)
	}

	// Function to display the menu and handle updates
	async showMenu(config: Config) {
		type ConfigKey = keyof typeof config
		while (true) {
			// Display a menu of keys to choose from
			const selectedKey = await Select.prompt({
				message: 'Select a configuration key to update',
				options: Object.keys(config),
			}) as ConfigKey

			if ((config === undefined) || (selectedKey === undefined)) {
				break
			}
			// Display the current value and allow the user to input a new value
			const newValue = await Input.prompt({
				message: `Enter a new value for ${String(selectedKey)} (current: ${config[selectedKey]})`,
				default: config[selectedKey]?.toString(),
				validate: (value) => {
					// Validate numerical inputs
					if (isNaN(Number(value))) {
						return 'Please enter a valid number.'
					}
					return true
				},
			})

			// Update the configuration with the new value
			config[selectedKey] = Number(newValue) as unknown as undefined
			console.log(`Updated ${selectedKey} to ${newValue}`)

			// Ask if the user wants to continue
			const continueEditing = await Select.prompt({
				message: 'Do you want to edit another key?',
				options: ['Yes', 'No'],
			})

			if (continueEditing === 'No') {
				return config
			}
		}
	}

	private async waitForExit() {
		let exit = true
		while (exit) {
			const data = new Uint8Array(8)

			Deno.stdin.setRaw(true)
			const nread = await Deno.stdin.read(data)
			Deno.stdin.setRaw(false)

			if (nread === null) {
				break
			}

			const keys: Array<KeyCode> = parse(data.subarray(0, nread))

			for (const key of keys) {
				if (key.ctrl && key.name === 'c') {
					console.log('\n\nTermination signal received. Shutting down...')
					exit = false
				}
				if (key.name === 'q') {
					console.log('\n\nQuit...')
					exit = false
				}
				if (key.name === 'f') {
					await this.handleFaucet()
				}
				if (key.name === 'b') {
					await this.handleBalance()
				}
			}
		}
	}

	private async handleFaucet() {
		this.txScan.unwatch?.()
		const address = await Input.prompt({
			message: `Enter destination address: `,
			validate: (address) => {
				if (!(isCoreAddress(address) || isEspaceAddress(address))) {
					return 'Please enter a valid core or espace address.'
				}
				return true
			},
		})
		const amount = await Input.prompt({
			message: `Enter amount: `,
			default: '100',
			validate: (value) => {
				if (isNaN(Number(value))) {
					return 'Please enter a valid number.'
				}
				return true
			},
		})

		try {
			const mw = this.server?.getMinerWallet()
			if (mw && address && amount) {
				await mw.faucet(address as `0x${string}` | Address, amount)
			}
		} catch (error) {
			console.error('An error occurred:', error)
		}

		this.txScan.watchTransactions()
	}

	private async handleBalance() {
		this.txScan.unwatch?.()
		try {
			const address = await Input.prompt({
				message: `Enter address to check balance: `,
				validate: (address) => {
					if (!(isCoreAddress(address) || isEspaceAddress(address))) {
						return 'Please enter a valid core or espace address.'
					}
					return true
				},
			})

			if (address) {
				const balance = isEspaceAddress(address) 
					? await this.txScan.espaceClient?.getBalance(address as `0x${string}`)
					: await this.txScan.coreClient?.getBalance(address as Address)

				if (balance !== undefined) {
					console.log(`\nBalance: ${balance} CFX`)
				} else {
					console.error('Failed to fetch balance')
				}
			}
		} catch (error) {
			console.error('An error occurred:', error)
		}

		this.txScan.watchTransactions()
	}

	public async parseArguments() {
		await this.program.parse(Deno.args)
	}
}

// Instantiate and parse arguments
const devkitCLI = new DevkitCLI()
await devkitCLI.parseArguments()
