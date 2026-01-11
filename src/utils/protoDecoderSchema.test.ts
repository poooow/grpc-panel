import { ProtoDecoderSchema } from "./protoDecoderSchema";
import { MessageDefinition } from "./schemaParser";

describe("ProtoDecoderSchema UUID Formatting", () => {
  const uuidBytes = new Uint8Array([
    0xc9, 0xab, 0xb0, 0x9d, 0x99, 0x3e, 0x45, 0x01, 0x96, 0xe7, 0xca, 0x04,
    0x2a, 0xc3, 0x22, 0xff,
  ]);
  const expectedUuid = "c9abb09d-993e-4501-96e7-ca042ac322ff";

  const messageDef: MessageDefinition = {
    name: "Test",
    fields: {
      1: { id: 1, name: "uuid", type: "bytes" },
    },
  };

  it("should format UUIDs from direct base64/bytes", () => {
    // Field 1 (uuid) -> 0x0A | Length (16) | Bytes
    const outerMsg = new Uint8Array([0x0a, 16, ...uuidBytes]);

    const { result } = ProtoDecoderSchema.decode(outerMsg, messageDef);
    expect(result["uuid"]).toBe(expectedUuid);
  });

  it("should format UUIDs from wrapped message", () => {
    // Inner message: Field 1 (0x0A) | Length (16) | Bytes
    const innerMsg = new Uint8Array([0x0a, 16, ...uuidBytes]);

    // Outer message: Field 1 (uuid) -> 0x0A | Length | innerMsg
    const outerMsg = new Uint8Array([0x0a, innerMsg.length, ...innerMsg]);

    const { result } = ProtoDecoderSchema.decode(outerMsg, messageDef);
    expect(result["uuid"]).toBe(expectedUuid);
  });

  it("should not format non-uuid fields", () => {
    const outerMsg = new Uint8Array([0x12, 16, ...uuidBytes]); // Field 2
    const def: MessageDefinition = {
      name: "Test",
      fields: {
        2: { id: 2, name: "other_field", type: "bytes" },
      },
    };
    const { result } = ProtoDecoderSchema.decode(outerMsg, def);
    // Should remain as base64/buffer
    // Note: decodeLengthDelimited converts to base64 if not string/nested message
    // uuidBytes starts with c9 -> not string, not nested message (unless heuristics match)
    // logic test: tryFormatUuid only runs if key matches /uuid/
    expect(result["other_field"]).not.toBe(expectedUuid);
  });
});
