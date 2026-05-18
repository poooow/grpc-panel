import { MessageDefinition } from './schemaParser';

type ProtoValue = string | number | bigint | Record<string, unknown> | ProtoValue[];

export class ProtoDecoderSchema {
    private buffer: Uint8Array;
    private offset: number = 0;
    private messageDef: MessageDefinition;
    private globalSchema: Record<string, MessageDefinition>;

    constructor(buffer: Uint8Array, messageDef: MessageDefinition, globalSchema: Record<string, MessageDefinition> = {}) {
        this.buffer = buffer;
        this.messageDef = messageDef;
        this.globalSchema = globalSchema;
    }

    static decode(buffer: Uint8Array, messageDef: MessageDefinition, globalSchema: Record<string, MessageDefinition> = {}): { result: Record<string, ProtoValue>, score: number } {
        const decoder = new ProtoDecoderSchema(buffer, messageDef, globalSchema);
        return decoder.readMessage(buffer.length);
    }

    private readMessage(end: number): { result: Record<string, ProtoValue>, score: number } {
        const result: Record<string, ProtoValue> = {};
        let score = 0;

        while (this.offset < end) {
            if (this.offset >= this.buffer.length) break;

            const tagBig = this.readVarint();
            const tag = Number(tagBig);
            const fieldNumber = tag >>> 3;
            const wireType = tag & 7;

            // Use schema name if available, otherwise fallback to field number
            const fieldDef = this.messageDef.fields[fieldNumber];
            const key = fieldDef ? fieldDef.name : fieldNumber.toString();

            if (fieldDef) {
                score++;
            }

            let value: ProtoValue | undefined;

            switch (wireType) {
                case 0: // Varint
                    value = this.readVarint();
                    break;
                case 1: // 64-bit
                    value = this.readFixed64();
                    break;
                case 2: { // Length-delimited
                    const lengthBig = this.readVarint();
                    const length = Number(lengthBig);
                    const data = this.readBytes(length);

                    // Check if this field refers to another message in the global schema
                    if (fieldDef && fieldDef.type && this.globalSchema[fieldDef.type]) {
                        // Recursively decode using the referenced message definition
                        const subMessageDef = this.globalSchema[fieldDef.type];
                        const subDecoder = new ProtoDecoderSchema(data, subMessageDef, this.globalSchema);
                        const { result: subResult, score: subScore } = subDecoder.readMessage(data.length);
                        
                        Object.defineProperty(subResult, '__base64', {
                            value: this.uint8ArrayToBase64(data),
                            enumerable: false
                        });

                        value = subResult;
                        score += subScore;
                    } else {
                        // Otherwise fallback to heuristic strategy
                        value = this.decodeLengthDelimited(data);
                    }
                    break;
                }
                case 5: // 32-bit
                    value = this.readFixed32();
                    break;
                default:
                    console.warn(`Unknown wire type ${wireType} at offset ${this.offset}`);
                    return { result, score };
            }

            if (value !== undefined) {
                if (key.match(/uuid/i)) {
                    value = this.tryFormatUuid(value);
                }

                if (result[key]) {
                    if (!Array.isArray(result[key])) {
                        result[key] = [result[key] as ProtoValue];
                    }
                    (result[key] as ProtoValue[]).push(value);
                } else {
                    result[key] = value;
                }
            }
        }
        return { result, score };
    }

    private tryFormatUuid(value: ProtoValue): ProtoValue {
        try {
            // Case 1: Wrapped object { "1": "base64" } or { "value": "base64" } or parsed as message incorrectly
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Check if the value itself has a raw __base64 property
                const rawBase64 = (value as { __base64?: string }).__base64;
                if (rawBase64) {
                    const formatted = this.formatUuidString(rawBase64);
                    if (formatted) return formatted;
                }

                const keys = Object.keys(value);
                if (keys.length === 1 && (keys[0] === '1' || keys[0] === 'value')) {
                    const inner = (value as Record<string, unknown>)[keys[0]];
                    if (typeof inner === 'string') {
                        const formatted = this.formatUuidString(inner);
                        if (formatted) return formatted;
                    } else if (typeof inner === 'object' && inner !== null) {
                        const innerRaw = (inner as { __base64?: string }).__base64;
                        if (innerRaw) {
                            const formatted = this.formatUuidString(innerRaw);
                            if (formatted) return formatted;
                        }
                    }
                }
            }
            
            // Case 2: Direct base64 string
            if (typeof value === 'string') {
                const formatted = this.formatUuidString(value);
                if (formatted) return formatted;
            }
        } catch (e) {
            // Ignore errors and return original value
        }
        return value;
    }

    private formatUuidString(base64: string): string | null {
        try {
            const binary = atob(base64);
            if (binary.length !== 16) return null;

            const bytes = new Uint8Array(16);
            for (let i = 0; i < 16; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            return [
                hex.slice(0, 8),
                hex.slice(8, 12),
                hex.slice(12, 16),
                hex.slice(16, 20),
                hex.slice(20)
            ].join('-');
        } catch (e) {
            return null;
        }
    }

    private decodeLengthDelimited(data: Uint8Array): ProtoValue {
        if (data.length === 0) return "";

        // Heuristic 1: Is it a valid UTF-8 string?
        let isString = true;
        for (let i = 0; i < data.length; i++) {
            const b = data[i];
            if (b < 0x20 && b !== 0x09 && b !== 0x0A && b !== 0x0D) {
                isString = false;
                break;
            }
        }

        if (isString) {
            try {
                const str = new TextDecoder("utf-8", { fatal: true }).decode(data);
                return str;
            } catch (e) {
                isString = false;
            }
        }

        const base64 = this.uint8ArrayToBase64(data);

        // Heuristic 2: Is it a nested message?
        try {
            // We use standard ProtoDecoder for nested messages as we don't have recursive schema context here easily
            // This avoids circular dependencies or complex registry lookups for this task
            const subDecoder = new ProtoDecoderSchema(data, { name: 'Nested', fields: {} }, this.globalSchema);
            const { result: message } = subDecoder.readMessage(data.length);
            // We ignore subScore here as 'Nested' schema has no fields to match, so score will be 0 anyway unless we change that logic.
            // But since heuristics don't use a real schema, score will always be 0.
            if (Object.keys(message).length > 0) {
                Object.defineProperty(message, '__base64', {
                    value: base64,
                    enumerable: false
                });
                return message;
            }
        } catch (e) {
            // Not a message
        }

        // Heuristic 3: Fallback to Base64
        return base64;
    }

    private readVarint(): bigint {
        let result = BigInt(0);
        let shift = BigInt(0);
        let scanning = true;
        while (scanning) {
            if (this.offset >= this.buffer.length) throw new Error("Unexpected EOF in varint");
            const b = this.buffer[this.offset++];
            result |= (BigInt(b) & BigInt(0x7f)) << shift;
            if ((b & 0x80) === 0) {
                scanning = false;
            } else {
                shift += BigInt(7);
            }
        }
        return result;
    }

    private readFixed64(): string {
        const bytes = this.readBytes(8);
        return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private readFixed32(): string {
        const bytes = this.readBytes(4);
        return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private readBytes(length: number): Uint8Array {
        if (this.offset + length > this.buffer.length) {
            length = this.buffer.length - this.offset;
        }
        const bytes = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return bytes;
    }

    private uint8ArrayToBase64(buffer: Uint8Array): string {
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }
}
