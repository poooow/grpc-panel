import { store } from '../../state';
import { ProtoDecoderSchema } from '../protoDecoderSchema';
import { highlightJson } from './json';
import { escapeHtml } from '../string';

// Minimum score to accept a schema match
const MIN_SCORE = 1;
// Weight for message name matching
const SCORE_MESSAGE_WEIGHT = 8;

export const formatGrpcSchema = (
  body: string,
  url: string,
  trafficType: "request" | "response",
  parsedBody?: Record<string, unknown>
): {
  body: string;
  schema: string;
  scoreFields: number;
  scoreMessage: number;
}[] => {
  try {
    const buffer = new Uint8Array(body.split("").map((c) => c.charCodeAt(0)));
    const globalSchema = store.getGlobalSchema();

    type SchemaMatch = {
      body: string;
      schema: string;
      scoreFields: number;
      scoreMessage: number;
    };
    const candidates: SchemaMatch[] = [];

    for (const [messageName, messageDef] of Object.entries(globalSchema)) {
      try {
        let decoded: unknown;
        let scoreFields = 0;

        if (parsedBody) {
          decoded = parsedBody;
          for (const key of Object.keys(parsedBody)) {
            const fieldExists = Object.values(messageDef.fields).some(
              (f) => f.name === key || f.id.toString() === key
            );
            if (fieldExists) scoreFields++;
          }
        } else {
          const { result, score } = ProtoDecoderSchema.decode(
            buffer,
            messageDef,
            globalSchema
          );
          decoded = result;
          scoreFields = score;
        }

        // Score based on comparison of URL path and message name
        let scoreMessage = 0;
        const path = new URL(url).pathname;

        const messageArray = messageName
          .split(/(?=[A-Z])/)
          .map((word) => word.toLowerCase());
        path.split("/").forEach((urlPart) => {
          if (trafficType === "request" && messageArray.includes("request")) {
            scoreMessage++;
          }
          if (trafficType === "response" && messageArray.includes("response")) {
            scoreMessage++;
          }
          if (messageArray.includes(urlPart)) {
            scoreMessage++;
          }
        });

        const scoreTotal = scoreFields + scoreMessage * SCORE_MESSAGE_WEIGHT;

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
            scoreFields: scoreTotal,
            scoreMessage: scoreMessage,
          });
        }
      } catch (e) {
        // Ignore decoding errors for mismatching schemas
      }
    }

    // Sort by score descending
    candidates.sort(
      (a, b) =>
        b.scoreFields + b.scoreMessage - (a.scoreFields + a.scoreMessage)
    );

    if (candidates.length === 0) {
      // Escape raw body to prevent XSS when rendered via innerHTML
      return [
        {
          body: escapeHtml(body),
          schema: "unknown",
          scoreFields: 0,
          scoreMessage: 0,
        },
      ];
    }

    // Return top results (without score field)
    return candidates.map((c) => ({
      body: c.body,
      schema: c.schema,
      scoreFields: c.scoreFields,
      scoreMessage: c.scoreMessage,
    }));
  } catch (e) {
    // Escape raw body to prevent XSS when rendered via innerHTML
    return [
      {
        body: escapeHtml(body),
        schema: "unknown",
        scoreFields: 0,
        scoreMessage: 0,
      },
    ];
  }
};
