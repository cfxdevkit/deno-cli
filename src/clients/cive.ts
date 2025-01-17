/**
 * Core Space client module for interacting with the Conflux Core network
 * @module CoreClient
 */

import {
	Address,
	Chain,
	createPublicClient,
	createWalletClient,
	formatCFX,
	http,
	parseCFX,
	PublicClient,
	WalletClient,
} from 'cive'
import {
	defineChain,
	encodeFunctionData,
	formatUnits,
	hexAddressToBase32,
	isAddress as isCoreAddress,
} from 'cive/utils'
import { Account, privateKeyToAccount } from 'cive/accounts'
import { Config } from '@xcfx/node'
import { isAddress as isEspaceAddress } from 'viem'
import { Block, Transaction } from '../types.ts'

/**
 * Client for interacting with Conflux Core Space
 * @class coreClient
 */
export class coreClient {
	private account: Account
	private public: PublicClient
	private wallet: WalletClient
	private cfg: Config
	private chain: Chain
	public address: Address

	/**
	 * Creates a new Core Space client instance
	 * @constructor
	 * @param {Config} cfg - Node configuration
	 * @param {number} index - Account index to use from genesis secrets
	 * @throws {Error} If configuration is invalid or index is out of range
	 */
	constructor(cfg: Config, index: number = 0) {
		if (!cfg.genesisSecrets || !cfg.chainId) {
			throw new Error('Invalid configuration: Missing chainId or genesisSecrets.')
		}
		if (index < 0 || index >= cfg.genesisSecrets.length) {
			throw new Error(`Invalid index: ${index}. Must be between 0 and ${cfg.genesisSecrets.length - 1}`)
		}
		this.cfg = cfg
		this.chain = defineChain({
			id: this.cfg.chainId!,
			name: 'CFXCoreLocal',
			nativeCurrency: {
				decimals: 18,
				name: 'Conflux',
				symbol: 'CFX',
			},
			rpcUrls: {
				default: {
					http: [`http://127.0.0.1:${this.cfg.jsonrpcHttpPort}`],
					webSocket: [`ws://127.0.0.1:${this.cfg.jsonrpcWsPort}`],
				},
			},
		})
		this.account = privateKeyToAccount(
			this.cfg.genesisSecrets![index] as `0x${string}`,
			{ networkId: this.cfg.chainId! },
		)
		this.address = this.account.address
		this.public = createPublicClient({
			pollingInterval: this.cfg.devBlockIntervalMs,
			transport: http(`http://127.0.0.1:${this.cfg.jsonrpcHttpPort}`),
			chain: this.chain,
		})
		this.wallet = createWalletClient({
			account: this.account,
			pollingInterval: this.cfg.devBlockIntervalMs,
			transport: http(`http://127.0.0.1:${this.cfg.jsonrpcHttpPort}`),
			chain: this.chain,
		})
	}

	/**
	 * Gets the balance of an address
	 * @async
	 * @param {Address} address - Address to check balance for
	 * @returns {Promise<string>} Balance in CFX
	 * @throws {Error} If address is invalid or balance check fails
	 */
	async getBalance(address: Address): Promise<string> {
		if (!isCoreAddress(address)) {
			throw new Error('Invalid address')
		}
		try {
			return formatCFX(await this.public.getBalance({ address: address }))
		} catch (error: unknown) {
			throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Sends a transaction to transfer CFX
	 * @async
	 * @param {Address} address - Recipient address
	 * @param {string} amount - Amount to send in CFX
	 * @returns {Promise<string>} Transaction hash
	 * @throws {Error} If address is invalid, amount is invalid, or transaction fails
	 */
	async sendTransaction(address: Address, amount: string): Promise<string> {
		if (!isCoreAddress(address)) {
			throw new Error('Invalid address')
		}
		if (!amount || isNaN(Number(amount))) {
			throw new Error('Invalid amount: Must be a valid number')
		}
		try {
			return await this.wallet.sendTransaction({
				to: address,
				value: parseCFX(amount),
				account: this.account,
				chain: this.chain,
			})
		} catch (error: unknown) {
			throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Sends CFX to an address (supports both Core and eSpace addresses)
	 * @async
	 * @param {`0x${string}` | Address} address - Recipient address
	 * @param {string} amount - Amount to send in CFX
	 * @returns {Promise<string>} Transaction hash
	 * @throws {Error} If address is invalid, amount is invalid, or transaction fails
	 */
	async faucet(address: `0x${string}` | Address, amount: string): Promise<string> {
		if (!amount || isNaN(Number(amount))) {
			throw new Error('Invalid amount: Must be a valid number')
		}
		try {
			if (isEspaceAddress(address)) {
				return await this.wallet.sendTransaction({
					chain: this.chain,
					account: this.account,
					to: hexAddressToBase32({
						hexAddress: '0x0888000000000000000000000000000000000006',
						networkId: this.chain.id,
					}),
					value: parseCFX(amount),
					data: encodeFunctionData({
						abi: (await import('./csc.abi.json', {
							with: { type: 'json' },
						})).default,
						functionName: 'transferEVM',
						args: [address],
					}),
				})
			} else if (isCoreAddress(address)) {
				return this.sendTransaction(address, amount)
			}
			throw new Error('Invalid address format')
		} catch (error: unknown) {
			throw new Error(`Faucet transaction failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Watches for new blocks and transactions
	 * @param {function} onNewBlock - Callback for new blocks
	 * @param {function} onNewTransaction - Callback for new transactions
	 * @returns {function} Unsubscribe function
	 */
	watchTx(
		onNewBlock = (block: Block) => console.log('Block Number:', block.blockNumber),
		onNewTransaction = (transactionDetails: Transaction) => console.log('Transaction Details:', transactionDetails),
	): () => void {
		return this.public.watchEpochNumber({
			emitMissed: false,
			epochTag: 'latest_mined',
			onEpochNumber: async (epochNumber: bigint) => {
				try {
					const blockHashes = await this.public.getBlocksByEpoch({ epochNumber })
					for (const hash of blockHashes) {
						try {
							const block = await this.public.getBlock({ blockHash: hash as `0x${string}` })
							onNewBlock(block)

							await Promise.all(
								block.transactions.map(async (txHash: `0x${string}`) => {
									try {
										const tx = await this.public.getTransaction({ hash: txHash })
										onNewTransaction(tx as Transaction)
									} catch (error: unknown) {
										console.error(
											`Failed to get transaction ${txHash}: ${
												error instanceof Error ? error.message : String(error)
											}`,
										)
									}
								}),
							)
						} catch (error: unknown) {
							console.error(
								`Failed to process block ${hash}: ${
									error instanceof Error ? error.message : String(error)
								}`,
							)
						}
					}
				} catch (error: unknown) {
					console.error(
						`Failed to get blocks for epoch ${epochNumber}: ${
							error instanceof Error ? error.message : String(error)
						}`,
					)
				}
			},
		})
	}

	/**
	 * Gets the balance of a token
	 * @async
	 * @param {Address} tokenAddress - Token contract address
	 * @returns {Promise<string>} Token balance
	 * @throws {Error} If token address is invalid or balance check fails
	 */
	async getTokenBalance(tokenAddress: Address): Promise<string> {
		if (!isCoreAddress(tokenAddress)) {
			throw new Error('Invalid token address')
		}
		const [balance, decimals] = await Promise.all([
			this.public.readContract({
				address: tokenAddress,
				abi: [{
					name: 'balanceOf',
					type: 'function',
					inputs: [{ name: 'account', type: 'address' }],
					outputs: [{ name: '', type: 'uint256' }],
					stateMutability: 'view',
				}],
				functionName: 'balanceOf',
				args: [this.address],
			}),
			this.public.readContract({
				address: tokenAddress,
				abi: [{
					name: 'decimals',
					type: 'function',
					inputs: [],
					outputs: [{ name: '', type: 'uint8' }],
					stateMutability: 'view',
				}],
				functionName: 'decimals',
			}),
		])

		return this.formatTokenAmount(balance, decimals)
	}

	/**
	 * Waits for a transaction to be confirmed
	 * @async
	 * @param {`0x${string}`} hash - Transaction hash
	 * @returns {Promise<void>}
	 */
	async waitForTransaction(hash: `0x${string}`): Promise<void> {
		await this.public.waitForTransactionReceipt({
			hash,
		})
	}

	/**
	 * Formats a token amount with proper decimals
	 * @param {bigint | string} amount - Raw token amount
	 * @param {number} decimals - Token decimals
	 * @returns {string} Formatted token amount
	 */
	formatTokenAmount(amount: bigint | string, decimals: number): string {
		const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount
		const formatted = formatUnits(amountBigInt, decimals)
		return Number(formatted).toFixed(4)
	}
}
