import { FormattedBody } from './types';
import { escapeHtml } from '../string';

export const formatForm = (body: string): FormattedBody => {
    try {
        const params = new URLSearchParams(body);
        let html = '<div class="form-data">';

        params.forEach((value, key) => {
            html += `<div class="form-row">
                        <span class="form-key">${escapeHtml(key)}:</span>
                        <span class="form-value">${escapeHtml(value)}</span>
                     </div>`;
        });

        html += '</div>';
        return { value: html, language: 'html' };
    } catch (e) {
        return { value: body, language: 'text' };
    }
};
