import {
	Address,
	Chain,
	createPublicClient,
	createWalletClient,
	http,
	parseCFX,
	PublicClient,
	WalletClient,
} from 'cive'
import { defineChain, encodeFunctionData, hexAddressToBase32, isAddress as isCoreAddress, formatUnits } from 'cive/utils'
import { Account, privateKeyToAccount } from 'cive/accounts'
import { Config } from '@xcfx/node'
import { isAddress as isEspaceAddress } from 'viem'
import { Block, Transaction } from '../types.ts'

export class coreClient {
	private account: Account
	private public: PublicClient
	private wallet: WalletClient
	private cfg: Config
	private chain: Chain
	public address: Address

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

	async getBalance(address: Address): Promise<bigint> {
		if (!isCoreAddress(address)) {
			throw new Error('Invalid address')
		}
		try {
			return await this.public.getBalance({ address })
		} catch (error) {
			throw new Error(`Failed to get balance: ${error.message}`)
		}
	}

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
		} catch (error) {
			throw new Error(`Transaction failed: ${error.message}`)
		}
	}

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
		} catch (error) {
			throw new Error(`Faucet transaction failed: ${error.message}`)
		}
	}

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
									} catch (error) {
										console.error(`Failed to get transaction ${txHash}: ${error.message}`)
									}
								}),
							)
						} catch (error) {
							console.error(`Failed to process block ${hash}: ${error.message}`)
						}
					}
				} catch (error) {
					console.error(`Failed to get blocks for epoch ${epochNumber}: ${error.message}`)
				}
			},
		})
	}

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
					stateMutability: 'view'
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
					stateMutability: 'view'
				}],
				functionName: 'decimals',
			})
		]);

		return this.formatTokenAmount(balance, decimals);
	}

	async waitForTransaction(hash: `0x${string}`): Promise<void> {
		await this.public.waitForTransactionReceipt({
			hash,
		});
	}

	formatTokenAmount(amount: bigint | string, decimals: number): string {
		const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
		const formatted = formatUnits(amountBigInt, decimals);
		return Number(formatted).toFixed(4);
	}
}
