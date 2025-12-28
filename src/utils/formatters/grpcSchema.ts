import { store } from '../../state';
import { ProtoDecoderSchema } from '../protoDecoderSchema';
import { highlightJson } from './json';

// Minimum score to accept a schema match
const MIN_SCORE = 1;

export const formatGrpcSchema = (body: string): { body: string, schema: string }[] => {
    try {
        const buffer = new Uint8Array(body.split('').map(c => c.charCodeAt(0)));
        const globalSchema = store.getGlobalSchema();

        type SchemaMatch = {
            body: string;
            schema: string;
            score: number;
        };
        const candidates: SchemaMatch[] = [];

        for (const [messageName, messageDef] of Object.entries(globalSchema)) {
            try {
                const { result: decoded, score } = ProtoDecoderSchema.decode(buffer, messageDef, globalSchema);

                // Use score heuristic: must have at least MIN_SCORE matching fields
                if (score >= MIN_SCORE) {
                    const jsonString = JSON.stringify(decoded, (key, value) =>
                        typeof value === 'bigint'
                            ? value.toString()
                            : value // return everything else unchanged
                        , 2);

                    candidates.push({
                        body: highlightJson(jsonString),
                        schema: messageName,
                        score: score
                    });
                }
            } catch (e) {
                // Ignore decoding errors for mismatching schemas
            }
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length === 0) {
            return [{ body, schema: 'unknown' }];
        }

        // Return top results (without score field)
        return candidates.map(c => ({ body: c.body, schema: c.schema }));

    } catch (e) {
        return [{ body, schema: 'unknown' }];
    }
};
