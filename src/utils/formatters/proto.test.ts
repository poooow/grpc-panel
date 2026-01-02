import { formatProto } from './proto';

describe('formatProto', () => {
    test('should handle empty input', () => {
        const result = formatProto('');
        expect(result.value).toBe('');
        expect(result.language).toBe('text');
    });

    test('should escape HTML characters', () => {
        const content = 'message Test < T > & "quote"';
        const result = formatProto(content);
        expect(result.value).toContain('&lt;');
        expect(result.value).toContain('&gt;');
        expect(result.value).toContain('&amp;');
    });

    test('should highlight single-line comments', () => {
        const content = '// This is a comment';
        const result = formatProto(content);
        expect(result.value).toContain('<span class="proto-comment">// This is a comment</span>');
    });

    test('should highlight multi-line comments', () => {
        const content = '/* Multi-line\ncomment */';
        const result = formatProto(content);
        expect(result.value).toContain('<span class="proto-comment">/* Multi-line\ncomment */</span>');
    });

    test('should highlight strings', () => {
        const content = 'string s = "hello world";';
        const result = formatProto(content);
        expect(result.value).toContain('<span class="proto-string">"hello world"</span>');
    });

    test('should highlight keywords', () => {
        const keywords = ['syntax', 'message', 'service', 'rpc', 'returns', 'repeated', 'optional'];
        const content = keywords.join(' ');
        const result = formatProto(content);

        keywords.forEach(keyword => {
            expect(result.value).toContain(`<span class="proto-keyword">${keyword}</span>`);
        });
    });

    test('should highlight types', () => {
        const types = ['int32', 'string', 'bool', 'bytes', 'double', 'float'];
        const content = types.join(' ');
        const result = formatProto(content);

        types.forEach(type => {
            expect(result.value).toContain(`<span class="proto-type">${type}</span>`);
        });
    });

    test('should highlight numbers', () => {
        const content = 'field = 123; fixed64 = 456;';
        const result = formatProto(content);
        expect(result.value).toContain('<span class="proto-number">123</span>');
        expect(result.value).toContain('<span class="proto-number">456</span>');
    });

    test('should handle mixed content correctly', () => {
        const content = `
            syntax = "proto3";
            // A message
            message Person {
                string name = 1;
                int32 id = 2;
            }
        `;
        const result = formatProto(content);

        expect(result.value).toContain('<span class="proto-keyword">syntax</span>');
        expect(result.value).toContain('<span class="proto-string">"proto3"</span>');
        expect(result.value).toContain('<span class="proto-comment">// A message</span>');
        expect(result.value).toContain('<span class="proto-keyword">message</span>');
        expect(result.value).toContain('Person');
        expect(result.value).toContain('<span class="proto-type">string</span>');
        expect(result.value).toContain('<span class="proto-number">1</span>');
        expect(result.value).toContain('<span class="proto-type">int32</span>');
        expect(result.value).toContain('<span class="proto-number">2</span>');
    });
});
