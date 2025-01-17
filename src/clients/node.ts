/**
 * Transaction monitoring module for tracking blockchain activity
 * @module TransactionMonitor
 */

import { blue, bold, cyan, gray, green, yellow } from '@std/fmt/colors'
import { Config } from '@xcfx/node'
import { coreClient } from './cive.ts'
import { espaceClient } from './viem.ts'
import { CliSpinner } from '../spinner.ts'
import { formatCFX } from 'cive'
import { formatEther } from 'viem'
import { Block, BlockInfo, Transaction } from '../types.ts'
import { getTerminalSize, truncateText } from '../utils/terminal.ts'

/**
 * Monitors transactions and blocks across both Core Space and eSpace
 * @class TransactionMonitor
 */
export class TransactionMonitor {
	/** Core Space client instance */
	public coreClient?: coreClient
	/** eSpace client instance */
	public espaceClient?: espaceClient
	/** Latest Core Space block info */
	private coreBlock?: BlockInfo
	/** Latest eSpace block info */
	private espaceBlock?: BlockInfo
	/** CLI spinner for visual feedback */
	private cs: CliSpinner
	/** Footer text for display */
	private footer: string
	/** Function to unsubscribe from watching */
	public unwatch: (() => void) | undefined

	/**
	 * Creates a new transaction monitor instance
	 * @constructor
	 */
	constructor() {
		this.cs = new CliSpinner()
		this.footer = ''
		this.unwatch = undefined
		this.coreBlock = { number: 0n, timestamp: '', label: 'core' }
		this.espaceBlock = { number: 0n, timestamp: '', label: 'espace' }
	}

	/**
	 * Initializes blockchain clients
	 * @param {Config} cfg - Node configuration
	 */
	public initializeClients(cfg: Config) {
		this.coreClient = new coreClient(cfg)
		this.espaceClient = new espaceClient(cfg)
	}

	/**
	 * Formats a timestamp to locale string
	 * @private
	 * @param {bigint | number} timestamp - Unix timestamp
	 * @returns {string} Formatted timestamp
	 */
	private formatTimestamp(timestamp: bigint | number): string {
		return new Date(Number(timestamp) * 1000).toLocaleString()
	}

	/**
	 * Logs transaction details to console
	 * @private
	 * @param {Transaction} tx - Transaction details
	 * @param {BlockInfo} block - Block information
	 * @param {string} space - Space identifier ('core' or 'evm')
	 */
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

	/**
	 * Updates Core Space block information
	 * @private
	 * @param {Block} block - New block information
	 */
	private updateCoreBlock(block: Block) {
		if (this.coreBlock) {
			this.coreBlock.number = block.blockNumber || 0n
			this.coreBlock.timestamp = this.formatTimestamp(block.timestamp)
		}
		this.cs.setColor('green')
		this.csUpdate()
	}

	/**
	 * Updates eSpace block information
	 * @private
	 * @param {Block} block - New block information
	 */
	private updateEspaceBlock(block: Block) {
		if (this.espaceBlock) {
			this.espaceBlock.number = block.number || 0n
			this.espaceBlock.timestamp = this.formatTimestamp(block.timestamp)
		}
		this.cs.setColor('cyan')
		this.csUpdate()
	}

	/**
	 * Handles new Core Space transactions
	 * @private
	 * @param {Transaction} tx - Transaction details
	 */
	private handleCoreTransaction(tx: Transaction) {
		tx.value = formatCFX(BigInt(tx.value))
		if (this.coreBlock) {
			this.logTransaction(tx, this.coreBlock, 'core')
		}
	}

	/**
	 * Handles new eSpace transactions
	 * @private
	 * @param {Transaction} tx - Transaction details
	 */
	private handleEspaceTransaction(tx: Transaction) {
		tx.value = formatEther(BigInt(tx.value))
		if (this.espaceBlock) {
			this.logTransaction(tx, this.espaceBlock, 'evm')
		}
	}

	/**
	 * Updates the CLI spinner display
	 * @private
	 */
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

	/**
	 * Sets the footer text for display
	 * @param {string} footer - Footer text
	 */
	public setFooter(footer: string) {
		this.footer = footer
	}

	/**
	 * Starts watching for transactions on both networks
	 * @throws {Error} If clients are not initialized
	 */
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
