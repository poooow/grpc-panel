import { FormattedBody } from './types';

// Escaping <, >, and & is sufficient for safety in this specific innerHTML context.

export const formatJson = (body: string): FormattedBody => {
    try {
        const parsed = JSON.parse(body);
        const json = JSON.stringify(parsed, null, 2);

        const html = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });

        return { value: html, language: 'html' };
    } catch {
        return { value: body, language: 'text' };
    }
};
