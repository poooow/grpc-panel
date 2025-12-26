import { FormattedBody } from './types';
import { formatJson } from './json';
import { ProtoDecoder } from '../protoDecoder';

export const formatGrpc = (body: string): FormattedBody => {
    try {
        const buffer = new Uint8Array(body.split('').map(c => c.charCodeAt(0)));
        const protoObj = ProtoDecoder.decode(buffer);
        const jsonString = JSON.stringify(protoObj, null, 2);
        return formatJson(jsonString);
    } catch (e) {
        return { value: body, language: 'text' };
    }
};
