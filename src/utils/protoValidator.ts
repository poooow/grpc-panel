/**
 * Validates Protocol Buffer schema content.
 * Performs basic syntax validation without full parsing.
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateProtoSchema(content: string): ValidationResult {
    const trimmed = content.trim();

    if (!trimmed) {
        return { valid: false, error: 'Schema file is empty' };
    }

    // Check for syntax declaration
    const syntaxMatch = trimmed.match(/^\s*syntax\s*=\s*["'](proto[23])["']\s*;/m);
    if (!syntaxMatch) {
        return { valid: false, error: 'Missing or invalid syntax declaration (expected "proto2" or "proto3")' };
    }

    // Check for at least one message or service definition
    const hasMessage = /\bmessage\s+\w+\s*\{/.test(trimmed);
    const hasService = /\bservice\s+\w+\s*\{/.test(trimmed);
    const hasEnum = /\benum\s+\w+\s*\{/.test(trimmed);

    if (!hasMessage && !hasService && !hasEnum) {
        return { valid: false, error: 'No message, service, or enum definitions found' };
    }

    // Check bracket matching
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
        return { valid: false, error: `Mismatched braces: ${openBraces} opening, ${closeBraces} closing` };
    }

    // Check for common protobuf keywords with basic structure
    const lines = trimmed.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('//') || line.startsWith('/*')) {
            continue;
        }

        // Check for unclosed string literals
        const quotes = (line.match(/"/g) || []).length;
        if (quotes % 2 !== 0 && !line.includes('/*') && !line.includes('*/')) {
            return { valid: false, error: `Unclosed string literal on line ${i + 1}` };
        }
    }

    return { valid: true };
}
