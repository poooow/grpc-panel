import { type Traffic, store } from "../../state";
import { isGrpcRequest } from "../../utils/requestType";
import { formatBody } from '../../utils/formatters';
import { formatGet } from '../../utils/formatters/get';
import { formatGrpcSchema } from "../../utils/formatters/grpcSchema";
import { isBase64 } from '../../utils/string';

export const renderProtoBuffer = (traffic: Traffic): HTMLElement => {
    const content = document.createElement('div');
    content.className = 'detail-panel-content proto-buffer-content';

    // Request body
    const contentTypeReq = getRequestContentType(traffic);
    let requestContent = traffic.request.postData?.text || '';

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
    const formattedReqSchemas = formatGrpcSchema(requestContent);

    // Handle GET params if body is empty
    if (!requestContent && traffic.request.queryString && traffic.request.queryString.length > 0) {
        // Construct query string for formatter
        requestContent = traffic.request.queryString.map(q => `${q.name}=${encodeURIComponent(q.value)}`).join('&');
        formattedReq = formatGet(requestContent);
        sectionTitle = 'Request Parameters';
    }

    // We render synchronously for request
    const isGrpc = isGrpcRequest(traffic);
    content.appendChild(renderBodySection(sectionTitle, contentTypeReq, formattedReq, formattedReqSchemas, requestContent, isGrpc));

    // Response body
    const responseContainer = document.createElement('div');
    content.appendChild(responseContainer);

    // Async update
    traffic.getContent((bodyContent) => {
        const contentTypeRes = getResponseContentType(traffic);
        let responseContent = bodyContent || '';

        // Decode Base64 if needed
        if (isBase64(responseContent)) {
            try {
                responseContent = atob(responseContent);
            } catch (e) {
                // ignore
            }
        }

        const formattedRes = formatBody(responseContent, contentTypeRes);
        const formattedResSchemas = formatGrpcSchema(responseContent);
        responseContainer.appendChild(renderBodySection('Response Body', contentTypeRes, formattedRes, formattedResSchemas, responseContent, isGrpc));
    });

    return content;
};

const renderBodySection = (
    title: string,
    encoding: string,
    formatted: { value: string, language: string },
    formattedSchemas: { body: string, schema: string }[],
    raw: string,
    isGrpc: boolean
) => {
    const section = document.createElement('div');
    section.className = 'body-section';
    let initialTab = store.getUiState().activeProtoTab || 'decoded';

    // Fallback if schema tab is selected but we are not in grpc
    if (initialTab === 'schema' && !isGrpc) {
        initialTab = 'decoded';
    }

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

        const btnSchema = document.createElement('button');
        btnSchema.className = 'tab';
        btnSchema.textContent = 'Schema';

        const btnDecoded = document.createElement('button');
        btnDecoded.className = 'tab';
        btnDecoded.textContent = 'Decoded';

        const btnRaw = document.createElement('button');
        btnRaw.className = 'tab';
        btnRaw.textContent = 'Raw';

        // Initial state logic

        if (initialTab === 'schema') {
            btnSchema.classList.add('active');
        } else if (initialTab === 'raw') {
            btnRaw.classList.add('active');
        } else {
            btnDecoded.classList.add('active');
        }

        if (isGrpc) {
            tabs.appendChild(btnSchema);
        }
        tabs.appendChild(btnDecoded);
        tabs.appendChild(btnRaw);
        header.appendChild(tabs);

        // Tab Logic
        btnSchema.onclick = () => {
            btnSchema.classList.add('active');
            btnDecoded.classList.remove('active');
            btnRaw.classList.remove('active');
            section.querySelector('.view-schema')?.classList.remove('hidden');
            section.querySelector('.view-decoded')?.classList.add('hidden');
            section.querySelector('.view-raw')?.classList.add('hidden');
            store.setUiState({ activeProtoTab: 'schema' });
        };

        btnDecoded.onclick = () => {
            btnDecoded.classList.add('active');
            btnRaw.classList.remove('active');
            btnSchema.classList.remove('active');
            section.querySelector('.view-decoded')?.classList.remove('hidden');
            section.querySelector('.view-raw')?.classList.add('hidden');
            section.querySelector('.view-schema')?.classList.add('hidden');
            store.setUiState({ activeProtoTab: 'decoded' });
        };

        btnRaw.onclick = () => {
            btnRaw.classList.add('active');
            btnDecoded.classList.remove('active');
            btnSchema.classList.remove('active');
            section.querySelector('.view-decoded')?.classList.add('hidden');
            section.querySelector('.view-raw')?.classList.remove('hidden');
            section.querySelector('.view-schema')?.classList.add('hidden');
            store.setUiState({ activeProtoTab: 'raw' });
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
        const schemaView = document.createElement('div');
        schemaView.className = 'view-schema schema-decoded-list detail-panel-body hidden';
        // Remove 'detail-panel-body' class style inheritance since we are making a list
        schemaView.style.border = 'none';
        schemaView.style.padding = '0';
        schemaView.style.backgroundColor = 'transparent';

        if (formattedSchemas.some(schema => schema.schema !== 'unknown')) {
            formattedSchemas.forEach((schema, index) => {
                const item = document.createElement('div');
                item.className = 'schema-decoded-item';

                // Expand the first item by default
                const isFirst = index === 0;
                if (isFirst) {
                    item.classList.add('expanded');
                }

                // Header
                const header = document.createElement('div');
                header.className = 'schema-decoded-header';

                const icon = document.createElement('span');
                icon.className = 'schema-decoded-icon';
                icon.textContent = isFirst ? '▼' : '▶';

                const title = document.createElement('span');
                title.className = 'schema-decoded-title';
                title.textContent = schema.schema;

                header.appendChild(icon);
                header.appendChild(title);

                // Content
                const content = document.createElement('div');
                content.className = 'schema-decoded-content';
                content.innerHTML = `<pre>${schema.body}</pre>`;

                // Toggle click handler
                header.addEventListener('click', () => {
                    const expanded = item.classList.toggle('expanded');
                    icon.textContent = expanded ? '▼' : '▶';
                });

                item.appendChild(header);
                item.appendChild(content);
                schemaView.appendChild(item);
            });
        } else {
            const noMatch = document.createElement('div');
            noMatch.className = 'view-empty';
            noMatch.textContent = 'No matching schema found';
            noMatch.style.padding = '10px';
            schemaView.appendChild(noMatch);
        }

        const decodedView = document.createElement('div');
        decodedView.className = 'view-decoded detail-panel-body';
        if (initialTab !== 'decoded') {
            decodedView.classList.add('hidden');
        }

        if (formatted.language === 'html') {
            decodedView.innerHTML = formatted.value;
        } else {
            decodedView.textContent = formatted.value;
        }

        const rawView = document.createElement('div');
        rawView.className = 'view-raw detail-panel-body';
        if (initialTab !== 'raw') {
            rawView.classList.add('hidden');
        }
        rawView.textContent = raw;

        // Apply visibility to schema view also
        if (initialTab !== 'schema') {
            schemaView.classList.add('hidden');
        } else {
            schemaView.classList.remove('hidden');
        }

        bodyContainer.appendChild(schemaView);
        bodyContainer.appendChild(decodedView);
        bodyContainer.appendChild(rawView);
    }

    section.appendChild(bodyContainer);

    return section;
};

const getRequestContentType = (traffic: Traffic) => {
    if (traffic.request && traffic.request.headers && Array.isArray(traffic.request.headers)) {
        const contentType = traffic.request.headers.find(header => header.name.toLowerCase() === 'content-type');
        if (contentType) return contentType.value;
    }
    return traffic.request.postData?.mimeType || '';
}

const getResponseContentType = (traffic: Traffic) => {
    if (traffic.response && traffic.response.headers && Array.isArray(traffic.response.headers)) {
        const contentType = traffic.response.headers.find(header => header.name.toLowerCase() === 'content-type');
        if (contentType) return contentType.value;
    }
    return traffic.response.content?.mimeType || '';
}
