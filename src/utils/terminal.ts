/**
 * Terminal utility functions for handling display constraints and formatting
 * @module TerminalUtils
 */

/**
 * Gets the current terminal dimensions
 * @function getTerminalSize
 * @returns {{ columns: number; rows: number }} Object containing terminal dimensions
 * @throws {Error} If unable to get terminal size
 */
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

/**
 * Truncates text to fit within specified length, adding ellipsis if needed
 * @function truncateText
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return text.slice(0, maxLength - 3) + '...'
}
