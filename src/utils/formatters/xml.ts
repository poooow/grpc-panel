import { FormattedBody } from './types';

export const formatXml = (body: string): FormattedBody => {
    try {
        // Basic naive XML formatter for browser environment without external deps
        let formatted = '';
        let indent = '';
        const tab = '  ';

        body.split(/>\s*</).forEach(function (node) {
            if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
            formatted += indent + '<' + node + '>\r\n';
            if (node.match(/^<?\w[^>]*[^/]$/)) indent += tab;
        });

        return { value: formatted.substring(1, formatted.length - 3), language: 'text' };
    } catch {
        return { value: body, language: 'text' };
    }
};
