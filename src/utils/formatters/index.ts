import { formatJson } from './json';
import { formatXml } from './xml';
import { formatGrpc } from './grpc';
import { formatForm } from './form';
import { FormattedBody } from './types';

export const formatBody = (body: string, contentType: string = ''): FormattedBody => {
    if (!body) return { value: '', language: 'text' };

    // Normalize content type
    const type = contentType.toLowerCase();

    if (type.includes('application/grpc') || type.includes('application/x-protobuf') || type.includes('application/grpc-web')) {
        return formatGrpc(body);
    }

    if (type.includes('application/json')) {
        return formatJson(body);
    }

    if (type.includes('xml')) {
        return formatXml(body);
    }

    if (type.includes('application/x-www-form-urlencoded')) {
        return formatForm(body);
    }

    // Try auto-detect JSON if content type is missing or generic
    if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
        try {
            return formatJson(body);
        } catch {
            // Not JSON
        }
    }

    return { value: body, language: 'text' };
};
