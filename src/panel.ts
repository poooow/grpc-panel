import { store } from './state';
import './styles/main.scss';
import { trafficList, clearTrafficList, reRenderTrafficList } from './ui/trafficList';
import { nav } from './ui/nav';
import { resizeHandler } from './ui/resizeHandler';
import { detail } from './ui/detail';
import { isGrpcRequest } from './utils/requestType';

// Initialize UI
resizeHandler();
nav();

let requestIdCounter = 0;
let lastFilter = store.getUiState().filter;
let lastSelectedId = store.getUiState().selectedTrafficId;

// Subscribe to store changes
store.subscribe(({ traffic, ui }) => {
  if (ui.filter !== lastFilter) {
    lastFilter = ui.filter;
    reRenderTrafficList();
  }

  // Handle selection change
  if (ui.selectedTrafficId !== lastSelectedId) {
    const prev = document.getElementById(lastSelectedId || ''); // Handle potential null/empty
    if (prev) prev.classList.remove('selected');

    const current = document.getElementById(ui.selectedTrafficId || '');
    if (current) {
      current.classList.add('selected');
    }
    lastSelectedId = ui.selectedTrafficId;
  }

  // Check if traffic cleared
  if (traffic.length === 0) {
    clearTrafficList();
  }
});

chrome.devtools.network.onRequestFinished.addListener((request) => {
  requestIdCounter++;
  const traffic = { ...request, id: requestIdCounter.toString() };
  store.addTraffic(traffic);

  // Render just this item (it checks filter internally)
  trafficList(traffic);

  // Handle follow traffic
  const uiState = store.getUiState();
  if (uiState.followTraffic) {
    const isVisible = uiState.filter === 'ALL' || (uiState.filter === 'GRPC' && isGrpcRequest(traffic));

    if (isVisible) {
      store.setUiState({ selectedTrafficId: traffic.id });
      detail(traffic);
    }
  }
});
