export function getTerminalSize(): { columns: number; rows: number } {
	try {
		// Get terminal size using Deno.consoleSize()
		const { columns, rows } = Deno.consoleSize()
		return { columns, rows }
	} catch {
		// Fallback to a default size if we can't get the terminal size
		return { columns: 80, rows: 24 }
	}
}

export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return text.slice(0, maxLength - 3) + '...'
}
