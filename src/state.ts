import { MessageDefinition, parseProtoSchema } from './utils/schemaParser';

export interface ProtoSchemaFile {
    id: string;
    name: string;
    content: string;
    createdAt: number;
}

export interface UIState {
    followTraffic: boolean;
    selectedTrafficId: string | null;
    filter: 'ALL' | 'GRPC';
    activeDetailTab?: 'overview' | 'proto' | 'schemas';
    activeProtoTab?: 'schema' | 'decoded' | 'raw';
}

export type Traffic = chrome.devtools.network.Request & { id: string };

export type StoreListener = (data: { traffic: Traffic[]; ui: UIState }) => void;

export class Store {
    private traffic: Traffic[] = [];
    private ui: UIState = { followTraffic: false, selectedTrafficId: null, filter: 'ALL', activeDetailTab: 'proto', activeProtoTab: 'decoded' };
    private schemas: ProtoSchemaFile[] = [];
    private globalSchema: Record<string, MessageDefinition> = {};
    private listeners: StoreListener[] = [];
    private schemaListeners: ((schemas: ProtoSchemaFile[]) => void)[] = [];

    constructor() {
        this.loadUiState();
        this.loadSchemas();
    }

    getTraffic(): Traffic[] {
        return this.traffic;
    }

    getUiState(): UIState {
        return this.ui;
    }

    getSchemaFiles(): ProtoSchemaFile[] {
        return this.schemas;
    }

    getGlobalSchema(): Record<string, MessageDefinition> {
        return this.globalSchema;
    }

    addTraffic(request: Traffic) {
        // Limit to 1000 items so we don't cause UI to become unresponsive
        if (this.traffic.length >= 1000) {
            this.traffic.shift();
        }
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

    addSchema(schema: ProtoSchemaFile) {
        this.schemas.push(schema);
        this.rebuildGlobalSchema();
        this.saveSchemas();
        this.notifySchemaListeners();
    }

    removeSchema(id: string) {
        this.schemas = this.schemas.filter((s) => s.id !== id);
        this.rebuildGlobalSchema();
        this.saveSchemas();
        this.notifySchemaListeners();
    }

    forceSchemaUpdate() {
        this.notifySchemaListeners();
    }

    subscribe(listener: StoreListener) {
        this.listeners.push(listener);
        // Initial call
        listener({ traffic: this.traffic, ui: this.ui });
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    subscribeSchemas(listener: (schemas: ProtoSchemaFile[]) => void) {
        this.schemaListeners.push(listener);
        // Initial call
        listener(this.schemas);
        return () => {
            this.schemaListeners = this.schemaListeners.filter((l) => l !== listener);
        };
    }

    private rebuildGlobalSchema() {
        this.globalSchema = {};
        for (const schema of this.schemas) {
            const messages = parseProtoSchema(schema.content);
            this.globalSchema = { ...this.globalSchema, ...messages };
        }
    }

    private notify() {
        this.listeners.forEach((listener) => listener({ traffic: this.traffic, ui: this.ui }));
    }

    private notifySchemaListeners() {
        this.schemaListeners.forEach((listener) => listener(this.schemas));
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

    private saveSchemas() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ schemas: this.schemas });
        }
    }

    private loadSchemas() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('schemas', (result) => {
                if (result.schemas && Array.isArray(result.schemas)) {
                    this.schemas = result.schemas;
                    this.rebuildGlobalSchema();
                    this.notifySchemaListeners();
                }
            });
        }
    }
}

export const store = new Store();

