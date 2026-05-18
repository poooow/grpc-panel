import { MessageDefinition, parseProtoSchema } from "./utils/schemaParser";
import { parsePbDescriptor } from "./utils/pbDescriptorParser";

export interface ProtoSchemaFile {
    id: string;
    name: string;
    content: string;
    createdAt: number;
}

/** A compiled .pb FileDescriptorSet stored as a base64-encoded binary */
export interface PbDescriptorFile {
    id: string;
    name: string;
    /** Base64-encoded raw .pb binary */
    contentBase64: string;
    /** Human-readable summary: list of top-level message names */
    messageNames: string[];
    createdAt: number;
}

export interface UIState {
    followTraffic: boolean;
    selectedTrafficId: string | null;
    filter: "ALL" | "GRPC";
    activeDetailTab?: "overview" | "proto" | "schemas";
    activeProtoTab?: "schema" | "formatted" | "raw";
}

export type Traffic = chrome.devtools.network.Request & { id: string };

export type StoreListener = (data: { traffic: Traffic[]; ui: UIState }) => void;

export class Store {
    private traffic: Traffic[] = [];
    private ui: UIState = {
        followTraffic: false,
        selectedTrafficId: null,
        filter: "ALL",
        activeDetailTab: "proto",
        activeProtoTab: "formatted",
    };
    private schemas: ProtoSchemaFile[] = [];
    private pbDescriptors: PbDescriptorFile[] = [];
    private globalSchema: Record<string, MessageDefinition> = {};
    private listeners: StoreListener[] = [];
    private schemaListeners: ((schemas: ProtoSchemaFile[]) => void)[] = [];
    private pbDescriptorListeners: ((descriptors: PbDescriptorFile[]) => void)[] = [];

    constructor() {
        this.loadUiState();
        this.loadSchemas();
        this.loadPbDescriptors();
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

    getPbDescriptors(): PbDescriptorFile[] {
        return this.pbDescriptors;
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

    updateSchema(id: string, updates: Partial<ProtoSchemaFile>) {
        this.schemas = this.schemas.map((s) =>
            s.id === id ? { ...s, ...updates } : s
        );
        this.rebuildGlobalSchema();
        this.saveSchemas();
        this.notifySchemaListeners();
    }

    forceSchemaUpdate() {
        this.notifySchemaListeners();
    }

    addPbDescriptor(descriptor: PbDescriptorFile) {
        this.pbDescriptors.push(descriptor);
        this.rebuildGlobalSchema();
        this.savePbDescriptors();
        this.notifyPbDescriptorListeners();
    }

    removePbDescriptor(id: string) {
        this.pbDescriptors = this.pbDescriptors.filter((d) => d.id !== id);
        this.rebuildGlobalSchema();
        this.savePbDescriptors();
        this.notifyPbDescriptorListeners();
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

    subscribePbDescriptors(listener: (descriptors: PbDescriptorFile[]) => void) {
        this.pbDescriptorListeners.push(listener);
        // Initial call
        listener(this.pbDescriptors);
        return () => {
            this.pbDescriptorListeners = this.pbDescriptorListeners.filter((l) => l !== listener);
        };
    }

    private rebuildGlobalSchema() {
        this.globalSchema = {};
        for (const schema of this.schemas) {
            const messages = parseProtoSchema(schema.content);
            this.globalSchema = { ...this.globalSchema, ...messages };
        }
        for (const pb of this.pbDescriptors) {
            try {
                const binary = Uint8Array.from(atob(pb.contentBase64), (c) => c.charCodeAt(0));
                const messages = parsePbDescriptor(binary);
                this.globalSchema = { ...this.globalSchema, ...messages };
            } catch (e) {
                console.warn('[grpc-panel] Failed to rebuild schema from .pb descriptor:', pb.name, e);
            }
        }
    }

    private notify() {
        this.listeners.forEach((listener) =>
            listener({ traffic: this.traffic, ui: this.ui })
        );
    }

    private notifySchemaListeners() {
        this.schemaListeners.forEach((listener) => listener(this.schemas));
    }

    private notifyPbDescriptorListeners() {
        this.pbDescriptorListeners.forEach((listener) => listener(this.pbDescriptors));
    }

    private saveUiState() {
        if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.set({ ui: this.ui });
        }
    }

    private loadUiState() {
        if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.get("ui", (result) => {
                if (result.ui) {
                    this.ui = { ...this.ui, ...result.ui };
                    // Ensure filter has a valid default if loading from old state
                    if (!this.ui.filter) this.ui.filter = "ALL";
                    this.notify();
                }
            });
        }
    }

    private saveSchemas() {
        if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.set({ schemas: this.schemas });
        }
    }

    private loadSchemas() {
        if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.get("schemas", (result) => {
                if (result.schemas && Array.isArray(result.schemas)) {
                    this.schemas = result.schemas;
                    this.rebuildGlobalSchema();
                    this.notifySchemaListeners();
                }
            });
        }
    }

    private savePbDescriptors() {
        if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.set({ pbDescriptors: this.pbDescriptors });
        }
    }

    private loadPbDescriptors() {
        if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.get("pbDescriptors", (result) => {
                if (result.pbDescriptors && Array.isArray(result.pbDescriptors)) {
                    this.pbDescriptors = result.pbDescriptors;
                    this.rebuildGlobalSchema();
                    this.notifyPbDescriptorListeners();
                }
            });
        }
    }
}

export const store = new Store();

