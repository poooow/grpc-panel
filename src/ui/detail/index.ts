import { store, type Traffic } from "../../state";
import { renderProtoBuffer } from './protoBuffer';
import { renderOverview } from './overview';

export const detail = (request: Traffic) => {
    const detailPanel = document.getElementById('detail-panel');
    if (!detailPanel) return;

    // Check if it was hidden (first open)
    if (detailPanel.classList.contains('hidden')) {
        detailPanel.classList.remove('hidden');

        const container = document.querySelector('.container') as HTMLElement;
        const trafficPanel = document.getElementById('traffic-panel');

        if (container && trafficPanel) {
            const containerWidth = container.getBoundingClientRect().width;
            trafficPanel.style.width = `${containerWidth / 2}px`;
            trafficPanel.style.flex = 'none';
        }
    }

    detailPanel.innerHTML = '';

    const contentContainer = document.createElement('div');
    contentContainer.id = 'detail-content-container';

    // activeTab state from store
    const uiState = store.getUiState();
    let activeTab: 'overview' | 'proto' = uiState.activeDetailTab || 'proto';

    const renderContent = () => {
        contentContainer.innerHTML = '';
        if (activeTab === 'proto') {
            contentContainer.appendChild(renderProtoBuffer(request));
        } else {
            contentContainer.appendChild(renderOverview(request));
        }
    };

    const onTabChange = (tab: string) => {
        activeTab = tab as 'overview' | 'proto';
        store.setUiState({ activeDetailTab: tab as 'overview' | 'proto' });
        renderContent();
    };

    detailPanel.appendChild(detailNav(activeTab, onTabChange));
    detailPanel.appendChild(contentContainer);
    renderContent();
};

const detailNav = (activeTab: string, onTabChange: (tab: string) => void) => {
    const nav = document.createElement('div');
    nav.className = 'detail-panel-nav';

    const createBtn = (id: string, text: string) => {
        const btn = document.createElement('button');
        btn.className = `nav-button ${activeTab === id ? 'active' : ''}`;
        btn.textContent = text;
        btn.onclick = () => {
            document.querySelectorAll('.detail-panel-nav .nav-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onTabChange(id);
        };
        return btn;
    };

    nav.appendChild(createBtn('proto', 'Proto buffer'));
    nav.appendChild(createBtn('overview', 'Overview'));

    return nav;
};