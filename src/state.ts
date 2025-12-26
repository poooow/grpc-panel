
export interface UIState {
    followTraffic: boolean;
    selectedTrafficId: string | null;
    filter: 'ALL' | 'GRPC';
    activeDetailTab?: 'overview' | 'proto';
}

export type Traffic = chrome.devtools.network.Request & { id: string };

export type StoreListener = (data: { traffic: Traffic[]; ui: UIState }) => void;

export class Store {
    private traffic: Traffic[] = [];
    private ui: UIState = { followTraffic: false, selectedTrafficId: null, filter: 'ALL', activeDetailTab: 'proto' };
    private listeners: StoreListener[] = [];

    constructor() {
        this.loadUiState();
    }

    getTraffic(): Traffic[] {
        return this.traffic;
    }

    getUiState(): UIState {
        return this.ui;
    }

    addTraffic(request: Traffic) {
        this.traffic.push(request);
        this.notify();
    }

    clearTraffic() {
        this.traffic = [];
        this.notify();
    }

    setUiState(newState: Partial<UIState>) {
        this.ui = { ...this.ui, ...newState };
        this.saveUiState();
        this.notify();
    }

    subscribe(listener: StoreListener) {
        this.listeners.push(listener);
        // Initial call
        listener({ traffic: this.traffic, ui: this.ui });
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach((listener) => listener({ traffic: this.traffic, ui: this.ui }));
    }

    private saveUiState() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ui: this.ui });
        }
    }

    private loadUiState() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('ui', (result) => {
                if (result.ui) {
                    this.ui = { ...this.ui, ...result.ui };
                    // Ensure filter has a valid default if loading from old state
                    if (!this.ui.filter) this.ui.filter = 'ALL';
                    this.notify();
                }
            });
        }
    }
}

export const store = new Store();
