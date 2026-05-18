/**
 * Minimal FileDescriptorSet parser for .pb files produced by:
 *   protoc --descriptor_set_out=out.pb --include_imports ...
 *
 * We hand-roll this so we have no external dependencies.
 * We only need field numbers from google.protobuf.descriptor.proto:
 *
 * FileDescriptorSet  { repeated FileDescriptorProto file = 1; }
 * FileDescriptorProto {
 *   string name = 1;
 *   string package = 2;
 *   repeated DescriptorProto message_type = 4;
 * }
 * DescriptorProto {
 *   string name = 1;
 *   repeated FieldDescriptorProto field = 2;
 *   repeated DescriptorProto nested_type = 3;
 * }
 * FieldDescriptorProto {
 *   string name = 1;
 *   int32  number = 3;
 *   string type_name = 6;   (for message/enum refs)
 *   FieldDescriptorProto.Type type = 5;  (enum; 11 = TYPE_MESSAGE)
 * }
 */

import { type MessageDefinition, type FieldDefinition } from './schemaParser';

// ---------------------------------------------------------------------------
// Primitive varint reader (operates on a view + offset box)
// ---------------------------------------------------------------------------

interface Cursor {
    buf: Uint8Array;
    pos: number;
}

function readVarint(c: Cursor): number {
    let result = 0;
    let shift = 0;
    while (c.pos < c.buf.length) {
        const b = c.buf[c.pos++];
        result |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) break;
        shift += 7;
        if (shift >= 35) throw new Error('Varint overflow while parsing .pb descriptor');
    }
    return result >>> 0; // treat as uint32
}

function skipBytes(c: Cursor, n: number): void {
    c.pos += n;
    if (c.pos > c.buf.length) c.pos = c.buf.length;
}

function readLengthDelimited(c: Cursor): Uint8Array {
    const len = readVarint(c);
    const start = c.pos;
    skipBytes(c, len);
    return c.buf.slice(start, start + len);
}

function readString(c: Cursor): string {
    return new TextDecoder().decode(readLengthDelimited(c));
}

// ---------------------------------------------------------------------------
// Skip an unknown field entirely based on wire type
// ---------------------------------------------------------------------------

function skipField(c: Cursor, wireType: number): void {
    switch (wireType) {
        case 0: readVarint(c); break;                       // varint
        case 1: skipBytes(c, 8); break;                     // 64-bit
        case 2: skipBytes(c, readVarint(c)); break;         // length-delimited
        case 5: skipBytes(c, 4); break;                     // 32-bit
        default: throw new Error(`Unknown wire type ${wireType} in .pb descriptor`);
    }
}

// ---------------------------------------------------------------------------
// FieldDescriptorProto  (only name=1, number=3, type=5, type_name=6)
// ---------------------------------------------------------------------------

interface RawField {
    name: string;
    number: number;
    type: number;           // FieldDescriptorProto.Type enum value
    typeName: string;       // e.g. ".mypackage.SomeMessage"
}

function parseFieldDescriptorProto(data: Uint8Array): RawField {
    const c: Cursor = { buf: data, pos: 0 };
    const f: RawField = { name: '', number: 0, type: 0, typeName: '' };

    while (c.pos < data.length) {
        const tag = readVarint(c);
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;

        switch (fieldNumber) {
            case 1: f.name = readString(c); break;          // name
            case 3: f.number = readVarint(c); break;        // number
            case 5: f.type = readVarint(c); break;          // type (enum)
            case 6: f.typeName = readString(c); break;      // type_name
            default: skipField(c, wireType); break;
        }
    }
    return f;
}

// ---------------------------------------------------------------------------
// DescriptorProto (name=1, field=2, nested_type=3)
// ---------------------------------------------------------------------------

function parseDescriptorProto(
    data: Uint8Array,
    packageName: string,
    out: Record<string, MessageDefinition>
): void {
    const c: Cursor = { buf: data, pos: 0 };
    let name = '';
    const rawFields: RawField[] = [];
    const nestedBlobs: Uint8Array[] = [];

    while (c.pos < data.length) {
        const tag = readVarint(c);
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;

        switch (fieldNumber) {
            case 1: name = readString(c); break;
            case 2: rawFields.push(parseFieldDescriptorProto(readLengthDelimited(c))); break;
            case 3: nestedBlobs.push(readLengthDelimited(c)); break;
            default: skipField(c, wireType); break;
        }
    }

    if (!name) return;

    const qualifiedName = packageName ? `${packageName}.${name}` : name;
    const messageDef: MessageDefinition = { name: qualifiedName, fields: {} };

    for (const rf of rawFields) {
        if (!rf.name || !rf.number) continue;

        // Derive a human-readable type string
        let typeStr = fieldTypeToString(rf.type);
        if (rf.typeName) {
            // Strip leading dot and package prefix for brevity
            typeStr = rf.typeName.replace(/^\./, '').split('.').pop() ?? rf.typeName;
        }

        const fieldDef: FieldDefinition = {
            name: rf.name,
            type: typeStr,
            id: rf.number,
        };
        messageDef.fields[rf.number] = fieldDef;
    }

    out[qualifiedName] = messageDef;

    // Also register under the simple (unqualified) name so that
    // ProtoDecoderSchema's cross-reference lookup succeeds:
    //   this.globalSchema[fieldDef.type]  — where fieldDef.type is the simple name.
    // Only set if not already occupied (avoids clobbering a same-named message
    // from a different package that was registered first).
    if (!(name in out)) {
        out[name] = messageDef;
    }

    // Recurse into nested messages
    for (const blob of nestedBlobs) {
        parseDescriptorProto(blob, qualifiedName, out);
    }
}

// ---------------------------------------------------------------------------
// FileDescriptorProto (name=1, package=2, message_type=4)
// ---------------------------------------------------------------------------

function parseFileDescriptorProto(
    data: Uint8Array,
    out: Record<string, MessageDefinition>
): void {
    const c: Cursor = { buf: data, pos: 0 };
    let packageName = '';
    const messageBlobs: Uint8Array[] = [];

    while (c.pos < data.length) {
        const tag = readVarint(c);
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;

        switch (fieldNumber) {
            case 2: packageName = readString(c); break;         // package
            case 4: messageBlobs.push(readLengthDelimited(c)); break;  // message_type
            default: skipField(c, wireType); break;
        }
    }

    for (const blob of messageBlobs) {
        parseDescriptorProto(blob, packageName, out);
    }
}

// ---------------------------------------------------------------------------
// FileDescriptorSet (repeated FileDescriptorProto file = 1)
// ---------------------------------------------------------------------------

/**
 * Parse a FileDescriptorSet binary (.pb) and return a map of message
 * definitions compatible with the existing `globalSchema` format.
 *
 * Throws if the binary cannot be parsed at all (e.g. not a valid proto binary).
 */
export function parsePbDescriptor(buffer: Uint8Array): Record<string, MessageDefinition> {
    const c: Cursor = { buf: buffer, pos: 0 };
    const out: Record<string, MessageDefinition> = {};

    while (c.pos < buffer.length) {
        const tag = readVarint(c);
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;

        if (fieldNumber === 1 && wireType === 2) {
            // file = FileDescriptorProto
            parseFileDescriptorProto(readLengthDelimited(c), out);
        } else {
            skipField(c, wireType);
        }
    }

    if (Object.keys(out).length === 0) {
        throw new Error('No message definitions found in the .pb file. Make sure it was generated with protoc --descriptor_set_out.');
    }

    return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps FieldDescriptorProto.Type enum values to readable strings */
function fieldTypeToString(type: number): string {
    const types: Record<number, string> = {
        1: 'double',
        2: 'float',
        3: 'int64',
        4: 'uint64',
        5: 'int32',
        6: 'fixed64',
        7: 'fixed32',
        8: 'bool',
        9: 'string',
        10: 'group',
        11: 'message',
        12: 'bytes',
        13: 'uint32',
        14: 'enum',
        15: 'sfixed32',
        16: 'sfixed64',
        17: 'sint32',
        18: 'sint64',
    };
    return types[type] ?? 'unknown';
}
