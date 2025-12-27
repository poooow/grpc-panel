import { FormattedBody } from './types';
import { formatJson } from './json';
import { ProtoDecoder } from '../protoDecoder';

export const formatGrpc = (body: string): FormattedBody => {
    try {
        const buffer = new Uint8Array(body.split('').map(c => c.charCodeAt(0)));
        const messages: Record<string, unknown>[] = [];
        let offset = 0;

        // Try to parse as gRPC frame(s)
        let isFramed = false;

        while (offset < buffer.length) {
            // Need at least 5 bytes for header
            if (buffer.length - offset < 5) break;

            const compressed = buffer[offset];
            const length = (buffer[offset + 1] << 24) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 8) | buffer[offset + 4];

            // Sanity check: length must fit in remaining buffer
            // Also, gRPC compression flag is typically 0 or 1.
            if ((compressed !== 0 && compressed !== 1) || offset + 5 + length > buffer.length) {
                // If we haven't successfully parsed any frames yet, assume it's NOT framed.
                if (messages.length === 0) {
                    break;
                }

                break;
            }

            // Frame is valid
            isFramed = true;
            const msgBody = buffer.slice(offset + 5, offset + 5 + length);
            messages.push(ProtoDecoder.decode(msgBody));
            offset += 5 + length;
        }

        if (!isFramed) {
            // Fallback: decode entire body as a single raw protobuf message
            messages.push(ProtoDecoder.decode(buffer));
        }

        const resultObj = messages.length === 1 ? messages[0] : messages;

        const jsonString = JSON.stringify(resultObj, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2);

        return formatJson(jsonString);
    } catch (e) {
        return { value: body, language: 'text' };
    }
};
