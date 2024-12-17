import {
	Account,
	Address,
	Chain,
	createPublicClient,
	createWalletClient,
	http,
	parseEther,
	PublicClient,
	WalletClient,
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
		return await this.wallet.sendTransaction({
			to: address,
			value: parseEther(amount),
			account: this.account,
			chain: this.chain,
		})
	}

	async getBalance(address: Address) {
		return await this.public.getBalance({ address: address })
	}

	watchTx(
		onNewBlock = (block: Block) => console.log('Block Number:', block.number),
		onNewTransaction = (transactionDetails: Transaction) => console.log('Transaction Details:', transactionDetails),
	) {
		return this.public.watchBlocks({
			emitMissed: false,
			includeTransactions: true,
			blockTag: 'latest',
			onError: (error: Error) => console.log(error),
			onBlock: async (block) => {
				const blockDetails = await this.public.getBlock({
					blockNumber: block.number,
				})
				onNewBlock(block)
				blockDetails.transactions.forEach(async (element) => {
					onNewTransaction(await this.public.getTransaction({ hash: element }))
				})
			},
		})
	}
}
