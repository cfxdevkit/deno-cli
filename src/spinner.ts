import { Spinner } from '@std/cli/unstable-spinner'
import { colors } from 'cliffy/color'

export class CliSpinner {
	spinner: Spinner
	constructor() {
		this.spinner = new Spinner()
	}

	start(message: string | null = null) {
		if (message) {
			this.spinner.message = message
		}
		this.spinner.start()
	}

	stop() {
		this.spinner.stop()
	}

	set(message: string) {
		this.spinner.message = message
	}

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

	succeed(message: string) {
		this.spinner.stop()
		console.log(`${colors.bold.green('√')} ${message}`)
	}

	fail(error: unknown) {
		this.spinner.stop()
		console.error(`${colors.bold.red('X')} ${this.formatError(error)}`)
	}

	protected formatError(error: unknown): string {
		if (error instanceof Error) {
			return error.message
		}
		return String(error)
	}
}
