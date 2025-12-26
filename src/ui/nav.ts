import { store } from "../state";

export function nav() {
    const navHeader = document.getElementById('nav-header');
    if (!navHeader) return;

    // Clear existing content
    navHeader.innerHTML = '';

    // Title
    const title = document.createElement('div');
    title.classList.add('nav-title');
    title.textContent = 'gRPC Tools';
    navHeader.appendChild(title);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flexGrow = '1';
    navHeader.appendChild(spacer);

    // Follow Traffic Checkbox
    const followLabel = document.createElement('label');
    followLabel.classList.add('nav-checkbox-label');

    const followCheckbox = document.createElement('input');
    followCheckbox.type = 'checkbox';
    followCheckbox.onchange = (e) => {
        store.setUiState({ followTraffic: (e.target as HTMLInputElement).checked });
    };

    followLabel.appendChild(followCheckbox);
    followLabel.appendChild(document.createTextNode('Follow Traffic'));
    navHeader.appendChild(followLabel);

    // Filter Toggle Group
    const filterGroup = document.createElement('div');
    filterGroup.classList.add('nav-group');

    const btnAll = document.createElement('button');
    btnAll.textContent = 'All Traffic';
    btnAll.classList.add('nav-button', 'toggle-left');
    btnAll.onclick = () => store.setUiState({ filter: 'ALL' });

    const btnGrpc = document.createElement('button');
    btnGrpc.textContent = 'Proto Buffer';
    btnGrpc.classList.add('nav-button', 'toggle-right');
    btnGrpc.onclick = () => store.setUiState({ filter: 'GRPC' });

    filterGroup.appendChild(btnAll);
    filterGroup.appendChild(btnGrpc);
    navHeader.appendChild(filterGroup);

    // Purge Button
    const purgeBtn = document.createElement('button');
    purgeBtn.classList.add('nav-button', 'icon-button');
    purgeBtn.title = 'Clear all traffic';
    // Filled trash icon
    purgeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>';
    purgeBtn.onclick = () => {
        store.clearTraffic();
    };
    navHeader.appendChild(purgeBtn);

    // Subscribe to state changes to update UI
    store.subscribe(({ ui }) => {
        // Update filter buttons
        if (ui.filter === 'ALL') {
            btnAll.classList.add('active');
            btnGrpc.classList.remove('active');
        } else {
            btnAll.classList.remove('active');
            btnGrpc.classList.add('active');
        }

        // Update follow checkbox
        followCheckbox.checked = ui.followTraffic;
    });
}
