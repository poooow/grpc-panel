import { FormattedBody } from './types';

/**
 * Formats Protocol Buffer (.proto) content with syntax highlighting.
 */
export const formatProto = (content: string): FormattedBody => {
    if (!content) return { value: '', language: 'text' };

    // Escape HTML special characters first
    let html = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const placeholders: string[] = [];
    const addPlaceholder = (text: string) => {
        placeholders.push(text);
        return `%%%PLACEHOLDER_${placeholders.length - 1}%%%`;
    };

    // 1. Extract comments and strings to protect them from further highlighting
    // We use a combined regex to capture them in order of appearance
    html = html.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*")/g, (match) => {
        if (match.startsWith('//') || match.startsWith('/*')) {
            return addPlaceholder(`<span class="proto-comment">${match}</span>`);
        } else {
            return addPlaceholder(`<span class="proto-string">${match}</span>`);
        }
    });

    // 2. Highlight keywords
    const keywords = [
        'syntax', 'package', 'import', 'option', 'message', 'enum', 'service',
        'rpc', 'returns', 'oneof', 'map', 'reserved', 'extensions', 'extend',
        'optional', 'required', 'repeated', 'public', 'weak', 'true', 'false'
    ];
    const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    html = html.replace(keywordPattern, '<span class="proto-keyword">$1</span>');

    // 3. Highlight types
    const types = [
        'double', 'float', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64',
        'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'bool', 'string', 'bytes'
    ];
    const typePattern = new RegExp(`\\b(${types.join('|')})\\b`, 'g');
    html = html.replace(typePattern, '<span class="proto-type">$1</span>');

    // 4. Highlight numbers (field numbers and numeric values)
    html = html.replace(/\b(\d+)\b/g, '<span class="proto-number">$1</span>');

    // 5. Restore placeholders
    placeholders.forEach((text, index) => {
        html = html.replace(`%%%PLACEHOLDER_${index}%%%`, text);
    });

    return { value: html, language: 'html' };
};
