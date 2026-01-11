import { store } from '../../state';
import { ProtoDecoderSchema } from '../protoDecoderSchema';
import { highlightJson } from './json';
import { escapeHtml } from '../string';

// Minimum score to accept a schema match
const MIN_SCORE = 1;
const SCORE_MESSAGE_WEIGHT = 3;

export const formatGrpcSchema = (
  body: string,
  url: string
): { body: string; schema: string; score: number }[] => {
  try {
    const buffer = new Uint8Array(body.split("").map((c) => c.charCodeAt(0)));
    const globalSchema = store.getGlobalSchema();

    type SchemaMatch = {
      body: string;
      schema: string;
      score: number;
    };
    const candidates: SchemaMatch[] = [];

    for (const [messageName, messageDef] of Object.entries(globalSchema)) {
      try {
        const { result: decoded, score: scoreFields } =
          ProtoDecoderSchema.decode(buffer, messageDef, globalSchema);

        // Score based on comparison of URL path and message name
        let scoreMessage = 0;
        const path = new URL(url).pathname;
        path.split("/").forEach((part) => {
          console.log(part, messageName);
          if (part.includes(messageName)) {
            scoreMessage = scoreMessage * SCORE_MESSAGE_WEIGHT;
          }
        });

        const scoreTotal = scoreFields + scoreMessage;

        // Use score heuristic: must have at least MIN_SCORE matching fields
        if (scoreTotal >= MIN_SCORE) {
          const jsonString = JSON.stringify(
            decoded,
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value, // return everything else unchanged
            2
          );

          candidates.push({
            body: highlightJson(jsonString),
            schema: messageName,
            score: scoreTotal,
          });
        }
      } catch (e) {
        // Ignore decoding errors for mismatching schemas
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      // Escape raw body to prevent XSS when rendered via innerHTML
      return [{ body: escapeHtml(body), schema: "unknown", score: 0 }];
    }

    // Return top results (without score field)
    return candidates.map((c) => ({
      body: c.body,
      schema: c.schema,
      score: c.score,
    }));
  } catch (e) {
    // Escape raw body to prevent XSS when rendered via innerHTML
    return [{ body: escapeHtml(body), schema: "unknown", score: 0 }];
  }
};
