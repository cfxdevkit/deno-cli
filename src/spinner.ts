/**
 * CLI Spinner module for providing visual feedback during operations
 * @module Spinner
 */

import { Spinner } from '@std/cli/unstable-spinner'
import { colors } from 'cliffy/color'

/**
 * CLI Spinner class that provides visual feedback for long-running operations
 * @class CliSpinner
 */
export class CliSpinner {
	/** The underlying spinner instance */
	spinner: Spinner

	/**
	 * Creates a new CLI spinner instance
	 * @constructor
	 */
	constructor() {
		this.spinner = new Spinner()
	}

	/**
	 * Starts the spinner with an optional message
	 * @param {string | null} message - Optional message to display
	 */
	start(message: string | null = null) {
		if (message) {
			this.spinner.message = message
		}
		this.spinner.start()
	}

	/**
	 * Stops the spinner
	 */
	stop() {
		this.spinner.stop()
	}

	/**
	 * Sets the spinner message
	 * @param {string} message - Message to display
	 */
	set(message: string) {
		this.spinner.message = message
	}

	/**
	 * Sets the spinner color
	 * @param {'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'} color - Color to set
	 */
	setColor(
		color:
			| 'black'
			| 'red'
			| 'green'
			| 'yellow'
			| 'blue'
			| 'magenta'
			| 'cyan'
			| 'white'
			| 'gray',
	) {
		this.spinner.color = color
	}

	/**
	 * Stops the spinner and displays a success message
	 * @param {string} message - Success message to display
	 */
	succeed(message: string) {
		this.spinner.stop()
		console.log(`${colors.bold.green('√')} ${message}`)
	}

	/**
	 * Stops the spinner and displays an error message
	 * @param {unknown} error - Error to display
	 */
	fail(error: unknown) {
		this.spinner.stop()
		console.error(`${colors.bold.red('X')} ${this.formatError(error)}`)
	}

	/**
	 * Formats an error for display
	 * @protected
	 * @param {unknown} error - Error to format
	 * @returns {string} Formatted error message
	 */
	protected formatError(error: unknown): string {
		if (error instanceof Error) {
			return error.message
		}
		return String(error)
	}
}
