import { type Traffic } from "../../state";
import { formatBody } from '../../utils/formatters';
import { formatGet } from '../../utils/formatters/get';
import { isBase64 } from '../../utils/string';

export const renderProtoBuffer = (request: Traffic): HTMLElement => {
    const content = document.createElement('div');
    content.className = 'detail-panel-content proto-buffer-content';

    // Request body
    const contentTypeReq = getContentType(request);
    let requestContent = request.request.postData?.text || '';

    // Decode Base64 if needed
    if (isBase64(requestContent)) {
        try {
            requestContent = atob(requestContent);
        } catch (e) {
            // ignore
        }
    }

    let formattedReq = formatBody(requestContent, contentTypeReq);
    let sectionTitle = 'Request Body';

    // Handle GET params if body is empty
    if (!requestContent && request.request.queryString && request.request.queryString.length > 0) {
        // Construct query string for formatter
        requestContent = request.request.queryString.map(q => `${q.name}=${encodeURIComponent(q.value)}`).join('&');
        formattedReq = formatGet(requestContent);
        sectionTitle = 'Request Parameters';
    }

    // We render synchronously for request
    content.appendChild(renderBodySection(sectionTitle, contentTypeReq, formattedReq, requestContent));

    // Response body
    const responseContainer = document.createElement('div');
    content.appendChild(responseContainer);

    // Async update
    request.getContent((bodyContent) => {
        const contentTypeRes = request.response.content?.mimeType || '';
        let content = bodyContent || '';

        // Decode Base64 if needed
        if (isBase64(content)) {
            try {
                content = atob(content);
            } catch (e) {
                // ignore
            }
        }

        const formattedRes = formatBody(content, contentTypeRes);
        responseContainer.appendChild(renderBodySection('Response Body', contentTypeRes, formattedRes, content));
    });

    return content;
};

const renderBodySection = (
    title: string,
    encoding: string,
    formatted: { value: string, language: string },
    raw: string
) => {
    const section = document.createElement('div');
    section.className = 'body-section';

    const header = document.createElement('div');
    header.className = 'body-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'body-title';
    titleSpan.textContent = title;

    const encodingSpan = document.createElement('span');
    encodingSpan.className = 'body-encoding';
    encodingSpan.textContent = encoding;

    header.appendChild(titleSpan);
    header.appendChild(encodingSpan);

    const isEmpty = !raw || raw.trim().length === 0;

    // Tabs
    if (!isEmpty) {
        const tabs = document.createElement('div');
        tabs.className = 'body-tabs';

        const btnDecoded = document.createElement('button');
        btnDecoded.className = 'tab active';
        btnDecoded.textContent = 'Decoded';

        const btnRaw = document.createElement('button');
        btnRaw.className = 'tab';
        btnRaw.textContent = 'Raw';

        tabs.appendChild(btnDecoded);
        tabs.appendChild(btnRaw);
        header.appendChild(tabs);

        // Tab Logic
        btnDecoded.onclick = () => {
            btnDecoded.classList.add('active');
            btnRaw.classList.remove('active');
            section.querySelector('.view-decoded')?.classList.remove('hidden');
            section.querySelector('.view-raw')?.classList.add('hidden');
        };

        btnRaw.onclick = () => {
            btnRaw.classList.add('active');
            btnDecoded.classList.remove('active');
            section.querySelector('.view-decoded')?.classList.add('hidden');
            section.querySelector('.view-raw')?.classList.remove('hidden');
        };
    }

    section.appendChild(header);

    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'body-container';

    if (isEmpty) {
        const emptyView = document.createElement('div');
        emptyView.className = 'view-empty';
        emptyView.textContent = '{empty}';
        bodyContainer.appendChild(emptyView);
    } else {
        const decodedView = document.createElement('div');
        decodedView.className = 'view-decoded detail-panel-body';
        if (formatted.language === 'html') {
            decodedView.innerHTML = formatted.value;
        } else {
            decodedView.textContent = formatted.value;
        }

        const rawView = document.createElement('div');
        rawView.className = 'view-raw detail-panel-body hidden';
        rawView.textContent = raw;

        bodyContainer.appendChild(decodedView);
        bodyContainer.appendChild(rawView);
    }

    section.appendChild(bodyContainer);

    return section;
};

const getContentType = (traffic: Traffic) => {
    if (traffic.request && traffic.request.headers && Array.isArray(traffic.request.headers)) {
        const contentType = traffic.request.headers.find(header => header.name.toLowerCase() === 'content-type');
        if (contentType) return contentType.value;
    }
    return traffic.request.postData?.mimeType || traffic.response.content?.mimeType || '';
}
