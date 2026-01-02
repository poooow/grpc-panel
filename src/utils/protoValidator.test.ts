import { validateProtoSchema } from './protoValidator';

describe('validateProtoSchema', () => {
    test('should fail on empty content', () => {
        expect(validateProtoSchema('').valid).toBe(false);
        expect(validateProtoSchema('   ').valid).toBe(false);
    });

    test('should fail on missing syntax', () => {
        const content = `
            message Test {
                string a = 1;
            }
        `;
        const result = validateProtoSchema(content);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('syntax declaration');
    });

    test('should fail on missing message/service/enum', () => {
        const content = `syntax = "proto3";`;
        const result = validateProtoSchema(content);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('No message');
    });

    test('should fail on mismatched braces', () => {
        const content = `
            syntax = "proto3";
            message Test {
                string a = 1;
        `;
        const result = validateProtoSchema(content);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Mismatched braces');
    });

    test('should fail on unclosed string', () => {
        const content = `
            syntax = "proto3";
            message Test {
                string a = "unclosed;
            }
        `;
        const result = validateProtoSchema(content);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unclosed string');
    });

    test('should pass on valid simple schema', () => {
        const content = `
            syntax = "proto3";
            message Test {
                string a = 1;
            }
        `;
        expect(validateProtoSchema(content).valid).toBe(true);
    });

    test('should pass on valid schema with comments', () => {
        const content = `
            // This is a comment
            syntax = "proto3";
            /* Block comment */
            message Test {
                string a = 1; // Inline comment
            }
        `;
        expect(validateProtoSchema(content).valid).toBe(true);
    });
});
