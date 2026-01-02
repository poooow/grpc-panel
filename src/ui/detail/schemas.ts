import { store, type ProtoSchemaFile } from '../../state';
import { validateProtoSchema } from '../../utils/protoValidator';
import { formatProto } from '../../utils/formatters/proto';

// Track expanded state per schema ID
const expandedSchemas = new Set<string>();
// Track editing state
let editingSchemaId: string | null = null;


export const renderSchemas = (): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'schemas-container';

    const renderContent = (schemas: ProtoSchemaFile[]) => {
        container.innerHTML = '';

        // Upload section
        const uploadSection = createUploadSection();
        container.appendChild(uploadSection);

        // Schema list
        const listSection = createSchemaList(schemas);
        container.appendChild(listSection);

        // Create new schema button
        const createBtn = createCreateButton();
        container.appendChild(createBtn);
    };

    // Subscribe to schema updates
    store.subscribeSchemas(renderContent);

    return container;
};

const createUploadSection = (): HTMLElement => {
    const section = document.createElement('div');
    section.className = 'schema-upload-section';

    const dropZone = document.createElement('div');
    dropZone.className = 'schema-drop-zone';
    dropZone.innerHTML = `
        <span class="drop-icon">📄</span>
        <span class="drop-text">Drop .proto files here or click to upload</span>
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.proto';
    fileInput.multiple = true;
    fileInput.style.display = 'none';

    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'schema-error';
    errorDisplay.style.display = 'none';

    const showError = (message: string) => {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        setTimeout(() => {
            errorDisplay.style.display = 'none';
        }, 5000);
    };

    const handleFiles = (files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach(file => {
            if (!file.name.endsWith('.proto')) {
                showError(`${file.name}: Only .proto files are allowed`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const validation = validateProtoSchema(content);

                if (!validation.valid) {
                    showError(`${file.name}: ${validation.error}`);
                    return;
                }

                const schema: ProtoSchemaFile = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    content: content,
                    createdAt: Date.now()
                };

                store.addSchema(schema);
            };
            reader.readAsText(file);
        });
    };

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer?.files || null);
    });

    section.appendChild(dropZone);
    section.appendChild(fileInput);
    section.appendChild(errorDisplay);

    return section;
};

const createSchemaList = (schemas: ProtoSchemaFile[]): HTMLElement => {
    const section = document.createElement('div');
    section.className = 'schema-list-section';

    if (schemas.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'schema-empty-state';
        emptyState.textContent = 'No schemas attached yet';
        section.appendChild(emptyState);
        return section;
    }

    const listHeader = document.createElement('div');
    listHeader.className = 'schema-list-header';
    listHeader.textContent = `Schemas (${schemas.length})`;
    section.appendChild(listHeader);

    const list = document.createElement('ul');
    list.className = 'schema-list';

    schemas.forEach(schema => {
        const item = document.createElement('li');
        item.className = 'schema-item';

        const isEditing = editingSchemaId === schema.id;

        if (isEditing) {
            item.appendChild(renderEditMode(schema));
            item.classList.add('expanded'); // Ensure container is large enough if needed
        } else {
            const isExpanded = expandedSchemas.has(schema.id);
            if (isExpanded) {
                item.classList.add('expanded');
            }

            const header = document.createElement('div');
            header.className = 'schema-header';

            const expandIcon = document.createElement('span');
            expandIcon.className = 'schema-expand-icon';
            expandIcon.textContent = isExpanded ? '▼' : '▶';

            const info = document.createElement('div');
            info.className = 'schema-info';

            const name = document.createElement('span');
            name.className = 'schema-name';
            name.textContent = schema.name;

            const date = document.createElement('span');
            date.className = 'schema-date';
            date.textContent = new Date(schema.createdAt).toLocaleDateString();

            info.appendChild(name);
            info.appendChild(date);

            const editBtn = document.createElement('button');
            editBtn.className = 'schema-edit-btn';
            editBtn.textContent = '✎';
            editBtn.title = 'Edit schema';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editingSchemaId = schema.id;
                store.forceSchemaUpdate();
            });

            header.appendChild(expandIcon);
            header.appendChild(info);
            header.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'schema-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete schema';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                store.removeSchema(schema.id);
            });
            header.appendChild(deleteBtn);


            // Toggle expand/collapse on header click
            header.addEventListener('click', () => {
                if (expandedSchemas.has(schema.id)) {
                    expandedSchemas.delete(schema.id);
                } else {
                    expandedSchemas.add(schema.id);
                }
                // Re-render the list
                store.forceSchemaUpdate();
            });

            item.appendChild(header);

            // Content container (shown when expanded)
            if (isExpanded) {
                const contentContainer = document.createElement('div');
                contentContainer.className = 'schema-content';

                const formatted = formatProto(schema.content);
                const pre = document.createElement('pre');
                pre.className = 'schema-content-code';
                pre.innerHTML = formatted.value;

                contentContainer.appendChild(pre);
                item.appendChild(contentContainer);
            }
        }

        list.appendChild(item);
    });

    section.appendChild(list);
    return section;
};

const renderEditMode = (schema: ProtoSchemaFile): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'schema-edit-form';

    // Name Input
    const nameRow = document.createElement('div');
    nameRow.className = 'schema-edit-row';
    const nameLabel = document.createElement('span');
    nameLabel.className = 'schema-edit-label';
    nameLabel.textContent = 'Schema Name';
    const nameInput = document.createElement('input');
    nameInput.className = 'schema-edit-name-input';
    nameInput.value = schema.name;
    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameInput);

    // Content Input
    const contentRow = document.createElement('div');
    contentRow.className = 'schema-edit-row';
    const contentLabel = document.createElement('span');
    contentLabel.className = 'schema-edit-label';
    contentLabel.textContent = 'Proto Definition';
    const contentInput = document.createElement('textarea');
    contentInput.className = 'schema-edit-textarea';
    contentInput.value = schema.content;
    contentInput.placeholder = 'syntax = "proto3";\n\nmessage MyMessage {\n  string field = 1;\n}';
    contentRow.appendChild(contentLabel);
    contentRow.appendChild(contentInput);

    // Error display for edit mode
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'schema-error';
    errorDisplay.style.display = 'none';
    errorDisplay.style.marginTop = '0';
    errorDisplay.style.marginBottom = '8px';

    const showError = (msg: string) => {
        errorDisplay.textContent = msg;
        errorDisplay.style.display = 'block';
        setTimeout(() => {
            errorDisplay.style.display = 'none';
        }, 5000);
    };

    // Actions
    const actions = document.createElement('div');
    actions.className = 'schema-edit-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'schema-action-btn cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
        editingSchemaId = null;
        store.forceSchemaUpdate();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'schema-action-btn save';
    saveBtn.textContent = 'Save Changes';
    saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        const newContent = contentInput.value;

        if (!newName) {
            showError('Schema name cannot be empty');
            return;
        }

        const validation = validateProtoSchema(newContent);
        if (!validation.valid) {
            showError(`Invalid proto schema: ${validation.error}`);
            return;
        }

        store.updateSchema(schema.id, {
            name: newName,
            content: newContent
        });
        editingSchemaId = null;
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    container.appendChild(nameRow);
    container.appendChild(contentRow);
    container.appendChild(errorDisplay);
    container.appendChild(actions);

    return container;
};

const createCreateButton = (): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'schema-create-section';

    const btn = document.createElement('button');
    btn.className = 'schema-create-btn';
    btn.textContent = '+ Create New Schema';

    btn.addEventListener('click', () => {
        const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSchema: ProtoSchemaFile = {
            id: newId,
            name: 'untitled.proto',
            content: 'syntax = "proto3";\n\nmessage NewMessage {\n  // Add fields here\n}',
            createdAt: Date.now()
        };

        store.addSchema(newSchema);
        editingSchemaId = newId; // Immediately enter edit mode
    });

    container.appendChild(btn);
    return container;
};
