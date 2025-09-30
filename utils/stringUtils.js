/**
 * String utility functions for text normalization and formatting
 */
/**
 * Converts a string to snake_case format
 *
 * Handles various input formats including:
 * - camelCase -> camel_case
 * - PascalCase -> pascal_case
 * - kebab-case -> kebab_case
 * - "spaced words" -> spaced_words
 * - Mixed formats and special characters
 *
 * @param input - The string to convert to snake_case
 * @returns The normalized string in snake_case format
 *
 * @example
 * ```typescript
 * toSnakeCase("camelCaseString") // "camel_case_string"
 * toSnakeCase("PascalCaseString") // "pascal_case_string"
 * toSnakeCase("kebab-case-string") // "kebab_case_string"
 * toSnakeCase("spaced words here") // "spaced_words_here"
 * toSnakeCase("Mixed-Format_String with spaces") // "mixed_format_string_with_spaces"
 * ```
 */
export function toSnakeCase(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    return input
        // Handle camelCase and PascalCase: insert underscore before uppercase letters
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        // Replace any sequence of non-alphanumeric characters with underscores
        .replace(/[^a-zA-Z0-9]+/g, '_')
        // Convert to lowercase
        .toLowerCase()
        // Remove leading and trailing underscores
        .replace(/^_+|_+$/g, '')
        // Replace multiple consecutive underscores with single underscore
        .replace(/_+/g, '_');
}
