/**
 * eSpace client module for interacting with the Conflux eSpace network
 * @module EspaceClient
 */

import {
	Account,
	Address,
	Chain,
	createPublicClient,
	createWalletClient,
	formatEther,
	formatUnits,
	http,
	isAddress,
	parseEther,
	PublicClient,
	WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { Config } from '@xcfx/node'
import { Block, Transaction } from '../types.ts'

/**
 * Client for interacting with Conflux eSpace (EVM compatible space)
 * @class espaceClient
 */
export class espaceClient {
	private account: Account
	private public: PublicClient
	private wallet: WalletClient
	private cfg: Config
	private chain: Chain
	public address: Address

	/**
	 * Creates a new eSpace client instance
	 * @constructor
	 * @param {Config} cfg - Node configuration
	 * @throws {Error} If configuration is invalid
	 */
	constructor(cfg: Config) {
		if (!cfg.evmChainId) {
			throw new Error('Invalid configuration: Missing evmChainId')
		}
		if (!cfg.genesisEvmSecrets?.[0]) {
			throw new Error('Invalid configuration: Missing genesis EVM secrets')
		}
		this.cfg = cfg
		this.chain = {
			id: this.cfg.evmChainId!,
			name: 'CFXLocal',
			nativeCurrency: {
				decimals: 18,
				name: 'Conflux',
				symbol: 'CFX',
			},
			rpcUrls: {
				default: {
					http: [`http://127.0.0.1:${this.cfg.jsonrpcHttpEthPort}`],
					webSocket: [`ws://127.0.0.1:${this.cfg.jsonrpcWsEthPort}`],
				},
			},
		}
		this.public = createPublicClient({
			pollingInterval: this.cfg.devBlockIntervalMs,
			transport: http(`http://127.0.0.1:${this.cfg.jsonrpcHttpEthPort}`),
		})
		this.account = privateKeyToAccount(
			this.cfg.genesisEvmSecrets![0] as `0x${string}`,
		)
		this.address = this.account.address
		this.wallet = createWalletClient({
			pollingInterval: this.cfg.devBlockIntervalMs,
			transport: http(`http://127.0.0.1:${this.cfg.jsonrpcHttpEthPort}`),
			chain: this.chain,
		})
	}

	/**
	 * Sends a transaction to transfer CFX
	 * @async
	 * @param {Address} address - Recipient address
	 * @param {string} amount - Amount to send in CFX
	 * @returns {Promise<`0x${string}`>} Transaction hash
	 * @throws {Error} If address is invalid, amount is invalid, or transaction fails
	 */
	async sendTransaction(address: Address, amount: string) {
		if (!isAddress(address)) {
			throw new Error('Invalid address: Address cannot be empty')
		}
		if (!amount || isNaN(Number(amount))) {
			throw new Error('Invalid amount: Must be a valid number')
		}
		try {
			return await this.wallet.sendTransaction({
				to: address,
				value: parseEther(amount),
				account: this.account,
				chain: this.chain,
			})
		} catch (error: unknown) {
			throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Gets the balance of an address
	 * @async
	 * @param {Address} address - Address to check balance for
	 * @returns {Promise<string>} Balance in CFX
	 * @throws {Error} If address is invalid or balance check fails
	 */
	async getBalance(address: Address): Promise<string> {
		if (!isAddress(address)) {
			throw new Error('Invalid address')
		}
		try {
			return formatEther(await this.public.getBalance({ address: address }))
		} catch (error: unknown) {
			throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Watches for new blocks and transactions
	 * @param {function} onNewBlock - Callback for new blocks
	 * @param {function} onNewTransaction - Callback for new transactions
	 * @returns {function} Unsubscribe function
	 */
	watchTx(
		onNewBlock = (block: Block) => console.log('Block Number:', block.number),
		onNewTransaction = (transactionDetails: Transaction) => console.log('Transaction Details:', transactionDetails),
	) {
		return this.public.watchBlocks({
			emitMissed: false,
			includeTransactions: true,
			blockTag: 'latest',
			onError: (error: Error) => console.error('Watch error:', error),
			onBlock: async (block) => {
				try {
					const blockDetails = await this.public.getBlock({
						blockNumber: block.number,
					})
					onNewBlock(block)
					await Promise.all(
						blockDetails.transactions.map(async (element) => {
							try {
								const tx = await this.public.getTransaction({ hash: element })
								onNewTransaction(tx)
							} catch (error: unknown) {
								console.error(
									`Failed to get transaction ${element}: ${
										error instanceof Error ? error.message : String(error)
									}`,
								)
							}
						}),
					)
				} catch (error: unknown) {
					console.error(
						`Failed to process block ${block.number}: ${
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
		if (!isAddress(tokenAddress)) {
			throw new Error('Invalid token address')
		}
		try {
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
		} catch (error: unknown) {
			throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Waits for a transaction to be confirmed
	 * @async
	 * @param {`0x${string}`} hash - Transaction hash
	 * @returns {Promise<void>}
	 * @throws {Error} If hash format is invalid or waiting fails
	 */
	async waitForTransaction(hash: `0x${string}`): Promise<void> {
		if (!hash.startsWith('0x')) {
			throw new Error('Invalid transaction hash format')
		}
		try {
			await this.public.waitForTransactionReceipt({ hash })
		} catch (error: unknown) {
			throw new Error(`Failed to wait for transaction: ${error instanceof Error ? error.message : String(error)}`)
		}
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
