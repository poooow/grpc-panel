// Define specialized types if needed, for now unknown is safer than any, or explicit Record
type ProtoValue = string | number | bigint | Record<string, unknown> | ProtoValue[];

export class ProtoDecoder {
    private buffer: Uint8Array;
    private offset: number = 0;

    constructor(buffer: Uint8Array) {
        this.buffer = buffer;
    }

    static decode(buffer: Uint8Array): Record<string, ProtoValue> {
        const decoder = new ProtoDecoder(buffer);
        return decoder.readMessage(buffer.length);
    }

    private readMessage(end: number): Record<string, ProtoValue> {
        const result: Record<string, ProtoValue> = {};

        while (this.offset < end) {
            if (this.offset >= this.buffer.length) break;

            const tagBig = this.readVarint();
            const tag = Number(tagBig);
            const fieldNumber = tag >>> 3;
            const wireType = tag & 7;

            const key = fieldNumber.toString();
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
                    value = this.decodeLengthDelimited(data);
                    break;
                }
                case 5: // 32-bit
                    value = this.readFixed32();
                    break;
                default:
                    // Unknown wire type, usually implies parsing error or end of stream
                    console.warn(`Unknown wire type ${wireType} at offset ${this.offset}`);
                    return result;
            }

            if (value !== undefined) {
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
        return result;
    }

    private decodeLengthDelimited(data: Uint8Array): ProtoValue {
        if (data.length === 0) return "";

        // Heuristic 1: Is it a valid UTF-8 string?
        // Check for control characters (except common whitespace)
        let isString = true;
        for (let i = 0; i < data.length; i++) {
            const b = data[i];
            // 0x09: Tab, 0x0A: LF, 0x0D: CR. Ranges: 0x20-0x7E (Printable), > 0x7F (UTF-8 multi-byte start)
            if (b < 0x20 && b !== 0x09 && b !== 0x0A && b !== 0x0D) {
                isString = false;
                break;
            }
        }

        if (isString) {
            try {
                // Double check with TextDecoder, it might throw or replace on invalid seq
                const str = new TextDecoder("utf-8", { fatal: true }).decode(data);
                return str;
            } catch (e) {
                isString = false; // Fallback
            }
        }

        // Heuristic 2: Is it a nested message?
        // We try to parse it. If it fully consumes the bytes as valid fields, we assume it's a message.
        // This is expensive but necessary for raw decoding.
        try {
            const subDecoder = new ProtoDecoder(data);
            const message = subDecoder.readMessage(data.length);
            // Simple check: did we get any keys?
            if (Object.keys(message).length > 0) {
                return message;
            }
        } catch (e) {
            // Not a message
        }

        // Heuristic 3: Fallback to Base64
        return this.uint8ArrayToBase64(data);
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
                // 64-bit max shift is roughly 63 bits. 
                // 10 bytes max for varint64.
                // We could add a check here if shift > 63, but BigInt handles arbitrary size.
                // Protobuf spec says varints are max 10 bytes.
            }
        }
        // BigInt implies signed in JS unrelated to 'unsigned' bitwise ops in number
        // but protobuf varints on wire are unsigned 64-bit unless zig-zag.
        // We return the raw bits as BigInt.
        return result;
    }

    private readFixed64(): string {
        // Return hex string for simplicity
        const bytes = this.readBytes(8);
        return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private readFixed32(): string {
        const bytes = this.readBytes(4);
        return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private readBytes(length: number): Uint8Array {
        if (this.offset + length > this.buffer.length) {

            // Let's clamp to avoid crash, but it means malformed.
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
