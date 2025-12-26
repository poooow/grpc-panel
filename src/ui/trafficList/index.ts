import { badge } from "../badge";
import { isGrpcRequest, isJsonRequest, isXmlRequest, isFormRequest } from "../../utils/requestType";
import { store, type Traffic } from "../../state";
import { detail } from "../detail";

export function trafficList(request: Traffic) {
    const uiState = store.getUiState();
    if (uiState.filter === 'GRPC' && !isGrpcRequest(request)) {
        return;
    }

    const trafficListEmpty = document.getElementById('traffic-list-empty');
    if (trafficListEmpty) trafficListEmpty.remove();

    const trafficList = document.getElementById('traffic-panel');

    // Create traffic list item
    const trafficListItem = document.createElement('div');
    trafficListItem.classList.add('traffic-list-item');
    trafficListItem.id = request.id;

    // Initial selection state
    const selectedId = store.getUiState().selectedTrafficId;
    if (request.id === selectedId) {
        trafficListItem.classList.add('selected');
    }

    trafficListItem.onclick = () => {
        store.setUiState({ selectedTrafficId: request.id });
        detail(request);
    };

    const trafficListItemText = trafficListItem.appendChild(document.createElement('div'));
    trafficListItemText.classList.add('traffic-list-item-text');
    const pathname = new URL(request.request.url).pathname;
    trafficListItemText.textContent = `${pathname}`;

    // Badges
    if (isGrpcRequest(request)) badge(trafficListItem, request, "encoding-grpc");
    else if (isJsonRequest(request)) badge(trafficListItem, request, "encoding-other", "JSON");
    else if (isXmlRequest(request)) badge(trafficListItem, request, "encoding-other", "XML");
    else if (isFormRequest(request)) badge(trafficListItem, request, "encoding-other", "FORM");
    badge(trafficListItem, request, 'method');
    badge(trafficListItem, request, 'status');

    trafficList?.prepend(trafficListItem);
}

export function clearTrafficList() {
    const trafficList = document.getElementById('traffic-panel');
    const detailPanel = document.getElementById('detail-panel');
    if (!trafficList || !detailPanel) return;
    trafficList.innerHTML = '';
    detailPanel.classList.add('hidden');

    // Add empty state back
    const emptyState = document.createElement('div');
    emptyState.id = 'traffic-list-empty';
    emptyState.innerHTML = `
        <p class="traffic-list-item-text">No requests captured yet.</p>
        <p class="traffic-list-item-subtext">Trigger some network traffic, then select a row</p>
     `;
    trafficList.appendChild(emptyState);
}

export function reRenderTrafficList() {
    clearTrafficList();
    const traffic = store.getTraffic();
    traffic.forEach(req => trafficList(req));
}