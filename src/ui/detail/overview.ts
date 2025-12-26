import { type Traffic } from "../../state";

export const renderOverview = (request: Traffic): HTMLElement => {
    const content = document.createElement('div');
    content.className = 'detail-panel-content overview-content';

    // General Summary
    content.appendChild(renderSummarySection('Summary', [
        { label: 'Request URL', value: request.request.url },
        { label: 'Request Method', value: request.request.method },
        { label: 'Status Code', value: `${request.response.status} ${request.response.statusText}` },
        { label: 'Remote Address', value: request.serverIPAddress || '-' },
        { label: 'Time', value: `${request.time.toFixed(2)} ms` }
    ]));

    // Request Headers
    if (request.request.headers && request.request.headers.length > 0) {
        content.appendChild(renderHeaderSection('Request Headers',
            request.request.headers.map(h => ({ label: h.name, value: h.value }))
        ));
    }

    // Response Headers
    if (request.response.headers && request.response.headers.length > 0) {
        content.appendChild(renderHeaderSection('Response Headers',
            request.response.headers.map(h => ({ label: h.name, value: h.value }))
        ));
    }

    return content;
};

const renderHeaderSection = (title: string, items: { label: string, value: string }[]) => {
    const section = document.createElement('div');
    section.className = 'body-section';

    const header = document.createElement('div');
    header.className = 'body-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'body-title';
    titleSpan.textContent = title;

    header.appendChild(titleSpan);
    section.appendChild(header);

    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'body-container';

    bodyContainer.appendChild(renderItems(items));
    section.appendChild(bodyContainer);

    return section;
};


const renderItems = (items: { label: string, value: string }[]) => {
    const list = document.createElement('div');
    list.className = 'overview-list detail-panel-body';

    items.forEach(item => {
        const listItem = list.appendChild(document.createElement('div'));
        listItem.className = 'overview-list-item';

        const label = listItem.appendChild(document.createElement('span'));
        label.className = 'overview-list-label';
        label.textContent = item.label + ': ';
        const value = listItem.appendChild(document.createElement('span'));
        value.className = 'overview-list-value';
        value.textContent = item.value;

        list.appendChild(listItem);
    });

    return list;
}

const renderSummarySection = (title: string, items: { label: string, value: string }[]) => {
    const header = document.createElement('div');
    header.className = 'body-header';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'body-title';
    titleSpan.textContent = title;
    header.appendChild(titleSpan);
    const section = document.createElement('div');
    section.className = 'body-section';
    section.appendChild(header);
    section.appendChild(renderItems(items));
    return section;
}
