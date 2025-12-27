
export interface FieldDefinition {
    name: string;
    type: string;
    id: number;
}

export interface MessageDefinition {
    name: string;
    fields: Record<number, FieldDefinition>;
}

export const parseProtoSchema = (content: string): Record<string, MessageDefinition> => {
    const messages: Record<string, MessageDefinition> = {};
    const lines = content.split('\n');

    let currentMessage: MessageDefinition | null = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        // Remove comments
        line = line.split('//')[0].trim();
        if (!line) continue;

        // Check for message start
        const messageMatch = line.match(/^message\s+(\w+)\s*\{?$/);
        if (messageMatch) {
            // If we were already in a message, we are ignoring nested messages for now as per requirements
            // But we need to track braces to know when the top level message ends
            if (currentMessage === null) {
                currentMessage = {
                    name: messageMatch[1],
                    fields: {}
                };
                messages[currentMessage.name] = currentMessage;
                if (line.includes('{')) braceCount = 1;
                else braceCount = 0; // Wait for opening brace
                continue;
            }
        }

        if (line.includes('{')) {
            braceCount++;
        }

        if (line.includes('}')) {
            braceCount--;
            if (braceCount === 0 && currentMessage) {
                currentMessage = null;
            }
        }

        if (currentMessage && braceCount > 0) {
            // Parse fields
            // basic pattern: type name = id;
            // repeated type name = id;
            const fieldMatch = line.match(/^(?:repeated\s+)?([\w.]+)\s+(\w+)\s*=\s*(\d+);/);
            if (fieldMatch) {
                const [, type, name, id] = fieldMatch;
                currentMessage.fields[parseInt(id, 10)] = {
                    name,
                    type,
                    id: parseInt(id, 10)
                };
            }
        }
    }

    return messages;
};
