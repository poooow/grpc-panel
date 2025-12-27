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

    // Highlight comments (// and /* */)
    html = html.replace(/(\/\/[^\n]*)/g, '<span class="proto-comment">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="proto-comment">$1</span>');

    // Highlight strings
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="proto-string">$1</span>');

    // Highlight keywords
    const keywords = [
        'syntax', 'package', 'import', 'option', 'message', 'enum', 'service',
        'rpc', 'returns', 'oneof', 'map', 'reserved', 'extensions', 'extend',
        'optional', 'required', 'repeated', 'public', 'weak', 'true', 'false'
    ];
    const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    html = html.replace(keywordPattern, '<span class="proto-keyword">$1</span>');

    // Highlight types
    const types = [
        'double', 'float', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64',
        'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'bool', 'string', 'bytes'
    ];
    const typePattern = new RegExp(`\\b(${types.join('|')})\\b`, 'g');
    html = html.replace(typePattern, '<span class="proto-type">$1</span>');

    // Highlight numbers (field numbers and numeric values)
    html = html.replace(/\b(\d+)\b/g, '<span class="proto-number">$1</span>');

    return { value: html, language: 'html' };
};
