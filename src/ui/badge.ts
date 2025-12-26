export function badge(
    parentElement: HTMLElement,
    request: chrome.devtools.network.Request,
    type: 'encoding-grpc' | 'encoding-other' | 'status' | 'method',
    value?: string
) {
    const badge = parentElement.appendChild(document.createElement('div'));
    badge.classList.add('badge');

    let content = 'unknown'

    switch (type) {
        case 'encoding-grpc':
            badge.classList.add('badge-grpc');
            content = 'gRPC';
            break;
        case 'encoding-other':
            badge.classList.add('badge-encoding-other');
            content = value || 'Other';
            break;
        case 'status':
            if (request.response.status >= 400) {
                badge.classList.add('badge-status-error');
            } else {
                badge.classList.add('badge-status-info');
            }
            content = String(request.response.status);
            break;
        case 'method':
            badge.classList.add('badge-method');
            content = request.request.method.toUpperCase();
            break;
    }

    badge.textContent = content;
}