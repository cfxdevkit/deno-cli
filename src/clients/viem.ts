import {
	Account,
	Address,
	Chain,
	createPublicClient,
	createWalletClient,
	formatUnits,
	http,
	isAddress,
	parseEther,
	PublicClient,
	WalletClient,
	formatEther
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { Config } from '@xcfx/node'
import { Block, Transaction } from '../types.ts'

export class espaceClient {
	private account: Account
	private public: PublicClient
	private wallet: WalletClient
	private cfg: Config
	private chain: Chain
	public address: Address
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
		} catch (error) {
			throw new Error(`Transaction failed: ${error.message}`)
		}
	}

	async getBalance(address: Address): Promise<string> {
		if (!isAddress(address)) {
			throw new Error('Invalid address')
		}
		try {
			return formatEther(await this.public.getBalance({ address: address }))
		} catch (error) {
			throw new Error(`Failed to get balance: ${error.message}`)
		}
	}

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
							} catch (error) {
								console.error(`Failed to get transaction ${element}: ${error.message}`)
							}
						}),
					)
				} catch (error) {
					console.error(`Failed to process block ${block.number}: ${error.message}`)
				}
			},
		})
	}

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
		} catch (error) {
			throw new Error(`Failed to get token balance: ${error.message}`)
		}
	}

	async waitForTransaction(hash: `0x${string}`): Promise<void> {
		if (!hash.startsWith('0x')) {
			throw new Error('Invalid transaction hash format')
		}
		try {
			await this.public.waitForTransactionReceipt({ hash })
		} catch (error) {
			throw new Error(`Failed to wait for transaction: ${error.message}`)
		}
	}

	formatTokenAmount(amount: bigint | string, decimals: number): string {
		const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount
		const formatted = formatUnits(amountBigInt, decimals)
		return Number(formatted).toFixed(4)
	}
}
