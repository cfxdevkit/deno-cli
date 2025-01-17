import { blue, bold, cyan, gray, green, yellow } from '@std/fmt/colors'
import { Config } from '@xcfx/node'
import { coreClient } from './cive.ts'
import { espaceClient } from './viem.ts'
import { CliSpinner } from '../spinner.ts'
import { formatCFX } from 'cive'
import { formatEther } from 'viem'
import { Block, BlockInfo, Transaction } from '../types.ts'
import { getTerminalSize, truncateText } from '../utils/terminal.ts'

export class TransactionMonitor {
	public coreClient?: coreClient
	public espaceClient?: espaceClient
	private coreBlock?: BlockInfo
	private espaceBlock?: BlockInfo
	private cs: CliSpinner
	private footer: string
	public unwatch: (() => void) | undefined

	constructor() {
		this.cs = new CliSpinner()
		this.footer = ''
		this.unwatch = undefined
		this.coreBlock = { number: 0n, timestamp: '', label: 'core' }
		this.espaceBlock = { number: 0n, timestamp: '', label: 'espace' }
	}

	public initializeClients(cfg: Config) {
		this.coreClient = new coreClient(cfg)
		this.espaceClient = new espaceClient(cfg)
	}

	private formatTimestamp(timestamp: bigint | number): string {
		return new Date(Number(timestamp) * 1000).toLocaleString()
	}

	private logTransaction(tx: Transaction, block: BlockInfo, space: string) {
		console.log()
		console.log(`${bold(green('Space:'))} ${space}`)
		console.log(`${bold(green('Block:'))} ${block.number}`)
		console.log(`${bold(green('Transaction hash:'))} ${tx.hash}`)
		console.log(`${bold(yellow('Timestamp:'))} ${block.timestamp}`)
		console.log(`${bold(yellow('From:'))} ${tx.from}`)
		console.log(`${bold(yellow('To:'))} ${tx.to}`)
		console.log(`${bold(green('Value:'))} ${tx.value} CFX`)
		console.log(`${bold(green('Gas Used:'))} ${tx.gas}`)
		console.log(`${bold(green('Gas Price:'))} ${tx.gasPrice} gwei`)
		console.log(`${bold(blue('\n~~\n'))}`)
	}

	private updateCoreBlock(block: Block) {
		if (this.coreBlock) {
			this.coreBlock.number = block.blockNumber || 0n
			this.coreBlock.timestamp = this.formatTimestamp(block.timestamp)
		}
		this.cs.setColor('green')
		this.csUpdate()
	}

	private updateEspaceBlock(block: Block) {
		if (this.espaceBlock) {
			this.espaceBlock.number = block.number || 0n
			this.espaceBlock.timestamp = this.formatTimestamp(block.timestamp)
		}
		this.cs.setColor('cyan')
		this.csUpdate()
	}

	private handleCoreTransaction(tx: Transaction) {
		tx.value = formatCFX(BigInt(tx.value))
		if (this.coreBlock) {
			this.logTransaction(tx, this.coreBlock, 'core')
		}
	}

	private handleEspaceTransaction(tx: Transaction) {
		tx.value = formatEther(BigInt(tx.value))
		if (this.espaceBlock) {
			this.logTransaction(tx, this.espaceBlock, 'evm')
		}
	}

	private csUpdate() {
		const timestamp = this.coreBlock?.timestamp || ''
		const cBlock = cyan('Core Block:')
		const cBlockNum = yellow(String(this.coreBlock?.number))
		const eBlock = green('Espace Block:')
		const eBlockNum = yellow(String(this.espaceBlock?.number))
		
		const fullMsg = `${timestamp} | ${cBlock} ${cBlockNum} | ${eBlock} ${eBlockNum} | ${this.footer}`
		
		const { columns } = getTerminalSize()
		const maxLength = columns - 2
		
		const truncatedMsg = truncateText(fullMsg, maxLength)
		const msg = bold(gray(truncatedMsg))
		
		this.cs.start(msg)
	}

	public setFooter(footer: string) {
		this.footer = footer
	}

	public watchTransactions(): void {
		if (!this.coreClient || !this.espaceClient) {
			throw new Error('Clients are not initialized')
		}

		const cUnwatch = this.coreClient.watchTx(
			this.updateCoreBlock.bind(this),
			this.handleCoreTransaction.bind(this),
		)

		const vUnwatch = this.espaceClient.watchTx(
			this.updateEspaceBlock.bind(this),
			this.handleEspaceTransaction.bind(this),
		)

		// Combine both unwatch functions into a single function
		this.unwatch = () => {
			cUnwatch()
			vUnwatch()
			this.cs.stop()
		}
	}
}
