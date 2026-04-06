const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get('room') || Math.random().toString(36).substring(7);
const collaborationId = urlParams.get('collaborationId');
const hostStorageKey = `pixelscript-host-${room}`;
const isPrimaryUser = urlParams.get('host') === '1' || (!urlParams.get('room')) || sessionStorage.getItem(hostStorageKey) === 'true';
const socket = io();
const persistedMessages = [];
let canUseDrawingTools = isPrimaryUser;
let savedChapterPanels = [];

if (isPrimaryUser) {
    sessionStorage.setItem(hostStorageKey, 'true');
}

if (isPrimaryUser && (urlParams.get('host') !== '1' || !urlParams.has('room'))) {
    const collaborationParamForHost = collaborationId ? `&collaborationId=${encodeURIComponent(collaborationId)}` : '';
    const newUrl = `${window.location.pathname}?room=${room}&host=1${collaborationParamForHost}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
}

const collaborationParam = collaborationId ? `&collaborationId=${encodeURIComponent(collaborationId)}` : '';
const roomUrl = `${window.location.origin}${window.location.pathname}?room=${room}${collaborationParam}`;
document.getElementById('room-url').textContent = roomUrl;
document.getElementById('copy-url-btn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(roomUrl);
    alert('Room URL copied to clipboard! Share this with your collaborator.');
});

function debounce(fn, wait = 700) {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), wait);
    };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeChapterPanels(panels = []) {
    return (Array.isArray(panels) ? panels : [])
        .filter(panel => panel && panel.imageUrl)
        .map((panel, index) => ({
            _id: panel._id,
            title: String(panel.title || '').trim(),
            imageUrl: panel.imageUrl,
            order: Number(panel.order) || index + 1
        }))
        .sort((a, b) => a.order - b.order)
        .map((panel, index) => ({
            ...panel,
            order: index + 1
        }));
}

function renderSavedPanels() {
    const list = document.getElementById('project-panels-list');
    if (!list) {
        return;
    }

    if (!savedChapterPanels.length) {
        list.innerHTML = '<div class="panel-empty">No panels saved yet. Draw on the canvas, then save each scene as a chapter panel.</div>';
        return;
    }

    list.innerHTML = savedChapterPanels.map(panel => `
        <div class="panel-card">
            <img src="${panel.imageUrl}" alt="${escapeHtml(panel.title || `Panel ${panel.order}`)}">
            <div class="panel-meta">
                <strong>${escapeHtml(panel.title || `Panel ${panel.order}`)}</strong>
                <span>Panel ${panel.order}</span>
            </div>
            <button class="panel-remove-btn" type="button" data-remove-panel="${panel.order}" aria-label="Remove panel ${panel.order}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function syncChapterPanels(statusMessage = 'Chapter panels synced.') {
    if (!collaborationId) {
        renderSavedPanels();
        return true;
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/collab/${collaborationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                chapterPanels: savedChapterPanels
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to sync chapter panels');
        }

        savedChapterPanels = normalizeChapterPanels(data.chapterPanels || savedChapterPanels);
        renderSavedPanels();
        if (projectStatus) {
            projectStatus.textContent = statusMessage;
        }
        return true;
    } catch (error) {
        console.error('Panel sync error:', error);
        alert(error.message || 'Failed to sync chapter panels');
        return false;
    }
}

async function saveCurrentPanel() {
    if (!canUseDrawingTools) {
        return;
    }

    const imageUrl = canvas.getPanelExportDataUrl();
    if (!imageUrl) {
        alert('Draw something on the canvas first.');
        return;
    }

    const panelTitleInput = document.getElementById('panel-title-input');
    const nextOrder = savedChapterPanels.length + 1;
    savedChapterPanels = normalizeChapterPanels([
        ...savedChapterPanels,
        {
            title: panelTitleInput?.value?.trim() || `Panel ${nextOrder}`,
            imageUrl,
            order: nextOrder
        }
    ]);
    renderSavedPanels();

    if (panelTitleInput) {
        panelTitleInput.value = '';
    }

    await syncChapterPanels(`Panel ${nextOrder} saved to the chapter storyboard.`);
}

async function saveWorkspace(payload = {}) {
    try {
        await fetch(`/api/workspaces/${room}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Workspace save error:', error);
    }
}

async function loadCollaborationDetails() {
    if (!collaborationId) {
        return;
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/collab/${collaborationId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            throw new Error('Failed to load collaboration');
        }

        const collaboration = await response.json();
        canUseDrawingTools = collaboration.currentUserRole === 'artist' || (!collaboration.currentUserRole && isPrimaryUser);
        applyWorkspaceRoleAccess();
        if (storyTitleInput) {
            storyTitleInput.value = collaboration.storyTitle || collaboration.title || '';
        }
        if (chapterNumberInput) {
            chapterNumberInput.value = collaboration.chapterNumber || 1;
        }
        if (chapterTitleInput) {
            chapterTitleInput.value = collaboration.chapterTitle || `Chapter ${collaboration.chapterNumber || 1}`;
        }
        if (storySynopsisInput) {
            storySynopsisInput.value = collaboration.storySynopsis || collaboration.description || '';
        }
        if (storyContentInput) {
            storyContentInput.value = collaboration.storyContent || '';
        }
        savedChapterPanels = normalizeChapterPanels(collaboration.chapterPanels || []);
        renderSavedPanels();
        const chapterLabel = collaboration.chapterLabel || `Chapter ${collaboration.chapterNumber || 1}`;
        updateWorkspacePresence(1);
        if (projectStatus) {
            const artistApproved = collaboration.publishRequest?.artistApproved ? 'artist approved' : 'artist pending';
            const writerApproved = collaboration.publishRequest?.writerApproved ? 'writer approved' : 'writer pending';
            projectStatus.textContent = `${chapterLabel}${collaboration.chapterTitle ? ` | ${collaboration.chapterTitle}` : ''}. Status: ${collaboration.status}. Publish approvals: ${artistApproved}, ${writerApproved}.`;
        }
        if (readerPreviewLink && collaboration.publishedStoryId) {
            readerPreviewLink.href = `reader.html?id=${collaboration.publishedStoryId}`;
            readerPreviewLink.style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('Collaboration load error:', error);
    }
}

async function saveCollaborationProject() {
    if (!collaborationId) {
        return;
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/collab/${collaborationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                storyTitle: storyTitleInput?.value || '',
                chapterNumber: Number(chapterNumberInput?.value) || 1,
                chapterTitle: chapterTitleInput?.value || '',
                storySynopsis: storySynopsisInput?.value || '',
                storyContent: storyContentInput?.value || ''
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to save project');
        }

        if (projectStatus) {
            projectStatus.textContent = `Project notes saved for chapter ${Number(chapterNumberInput?.value) || 1}.`;
        }
    } catch (error) {
        console.error('Project save error:', error);
        alert('Failed to save project notes');
    }
}

async function requestPublishApproval() {
    if (!collaborationId) {
        return;
    }

    await saveCollaborationProject();

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/collab/${collaborationId}/publish-request`, {
            method: 'PUT',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to request publish approval');
        }

        if (projectStatus) {
            const artistApproved = data.publishRequest?.artistApproved ? 'artist approved' : 'artist pending';
            const writerApproved = data.publishRequest?.writerApproved ? 'writer approved' : 'writer pending';
            projectStatus.textContent = data.publishRequest?.story
                ? 'Both collaborators approved. The story is now live in reader space.'
                : `Publish request updated: ${artistApproved}, ${writerApproved}.`;
        }

        if (readerPreviewLink && data.publishedStoryId) {
            readerPreviewLink.href = `reader.html?id=${data.publishedStoryId}`;
            readerPreviewLink.style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('Publish request error:', error);
        alert(error.message || 'Failed to request publish approval');
    }
}

const debouncedCanvasSave = debounce(canvasState => {
    saveWorkspace({ canvasState });
});

const debouncedChatSave = debounce(() => {
    saveWorkspace({ chat: persistedMessages });
}, 300);

function updateWorkspacePresence(userCount) {
    const partnerNameNode = document.getElementById('partner-name');
    if (!partnerNameNode) {
        return;
    }

    const chapterLabel = `Chapter ${Number(chapterNumberInput?.value) || 1}`;
    const titleLabel = chapterTitleInput?.value?.trim();
    partnerNameNode.textContent = userCount > 1
        ? `${chapterLabel}${titleLabel ? ` | ${titleLabel}` : ''} | ${userCount} collaborators connected`
        : `${chapterLabel}${titleLabel ? ` | ${titleLabel}` : ''} | Waiting for collaborator...`;
}

function renderAssets(assets = []) {
    const list = document.getElementById('workspace-assets');
    if (!list) {
        return;
    }

    if (!assets.length) {
        list.innerHTML = '<div class="asset-item"><span>No saved assets yet.</span></div>';
        return;
    }

    list.innerHTML = assets.map(asset => `
        <div class="asset-item">
            <a href="${asset.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(asset.name)}</a>
            <span>${escapeHtml(asset.uploadedBy || 'Collaborator')}</span>
        </div>
    `).join('');
}

class CollaborationCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.currentOpacity = 1;
        this.history = [];
        this.historyIndex = -1;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.previewSnapshot = null;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        if (isPrimaryUser) {
            this.bindPointerEvents();
        }
    }

    bindPointerEvents() {
        this.canvas.addEventListener('mousedown', event => this.startDrawing(event));
        this.canvas.addEventListener('mousemove', event => this.draw(event));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const savedState = this.getCanvasDataUrl();
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (savedState) {
            this.loadCanvasState(savedState, false);
        }
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    setColor(color) {
        this.currentColor = color;
    }

    setSize(size) {
        this.currentSize = Number(size);
    }

    setOpacity(opacity) {
        this.currentOpacity = Number(opacity);
    }

    applyStrokeStyle(colorOverride) {
        this.ctx.globalAlpha = this.currentTool === 'eraser' ? 1 : this.currentOpacity;
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : (colorOverride || this.currentColor);
        this.ctx.lineWidth = this.currentTool === 'eraser' ? this.currentSize * 2 : this.currentSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    getPointerPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    snapshotCanvas() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    restoreSnapshot(snapshot) {
        if (snapshot) {
            this.ctx.putImageData(snapshot, 0, 0);
        }
    }

    pushHistory() {
        const state = this.getCanvasDataUrl();
        if (!state) return;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
    }

    getCanvasDataUrl() {
        try {
            return this.canvas.toDataURL('image/png');
        } catch (error) {
            return null;
        }
    }

    getPanelExportDataUrl() {
        try {
            const maxWidth = 1440;
            const scale = Math.min(1, maxWidth / this.canvas.width);
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = Math.max(1, Math.round(this.canvas.width * scale));
            exportCanvas.height = Math.max(1, Math.round(this.canvas.height * scale));

            const exportCtx = exportCanvas.getContext('2d');
            exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
            exportCtx.drawImage(this.canvas, 0, 0, exportCanvas.width, exportCanvas.height);

            return exportCanvas.toDataURL('image/png');
        } catch (error) {
            return this.getCanvasDataUrl();
        }
    }

    emitCanvasState() {
        const state = this.getCanvasDataUrl();
        socket.emit('canvasState', {
            room,
            state
        });
        debouncedCanvasSave(state);
    }

    loadCanvasState(state, saveToHistory = true) {
        if (!state) return;
        const image = new Image();
        image.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
            if (saveToHistory) {
                this.pushHistory();
            }
        };
        image.src = state;
    }

    startDrawing(event) {
        if (!isPrimaryUser) return;

        this.isDrawing = true;
        const { x, y } = this.getPointerPosition(event);
        this.startX = x;
        this.startY = y;
        this.lastX = x;
        this.lastY = y;
        this.previewSnapshot = this.snapshotCanvas();

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.ctx.beginPath();
            this.applyStrokeStyle();
            this.ctx.moveTo(x, y);
        }
    }

    draw(event) {
        if (!this.isDrawing || !isPrimaryUser) return;

        const { x, y } = this.getPointerPosition(event);

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.applyStrokeStyle();
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();

            socket.emit('draw', {
                room,
                tool: this.currentTool,
                color: this.currentColor,
                size: this.currentSize,
                opacity: this.currentOpacity,
                x1: this.lastX,
                y1: this.lastY,
                x2: x,
                y2: y
            });

            this.lastX = x;
            this.lastY = y;
            return;
        }

        this.lastX = x;
        this.lastY = y;
        this.restoreSnapshot(this.previewSnapshot);
        this.drawShape({
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            opacity: this.currentOpacity,
            x1: this.startX,
            y1: this.startY,
            x2: x,
            y2: y
        });
    }

    stopDrawing() {
        if (!this.isDrawing || !isPrimaryUser) return;
        this.isDrawing = false;

        if (this.currentTool !== 'brush' && this.currentTool !== 'eraser') {
            this.restoreSnapshot(this.previewSnapshot);
            const finalShape = {
                room,
                tool: this.currentTool,
                color: this.currentColor,
                size: this.currentSize,
                opacity: this.currentOpacity,
                x1: this.startX,
                y1: this.startY,
                x2: this.lastX,
                y2: this.lastY
            };

            this.drawShape(finalShape);
            socket.emit('draw', finalShape);
        }

        this.previewSnapshot = null;
        this.pushHistory();
        this.emitCanvasState();
    }

    drawShape(data) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.globalAlpha = data.tool === 'eraser' ? 1 : (data.opacity ?? 1);
        this.ctx.strokeStyle = data.tool === 'eraser' ? '#ffffff' : data.color;
        this.ctx.lineWidth = data.tool === 'eraser' ? data.size * 2 : data.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        switch (data.tool) {
            case 'line':
                this.ctx.moveTo(data.x1, data.y1);
                this.ctx.lineTo(data.x2, data.y2);
                break;
            case 'circle': {
                const radius = Math.sqrt(((data.x2 - data.x1) ** 2) + ((data.y2 - data.y1) ** 2));
                this.ctx.arc(data.x1, data.y1, radius, 0, Math.PI * 2);
                break;
            }
            case 'rectangle':
                this.ctx.rect(data.x1, data.y1, data.x2 - data.x1, data.y2 - data.y1);
                break;
            default:
                this.ctx.moveTo(data.x1, data.y1);
                this.ctx.lineTo(data.x2, data.y2);
                break;
        }

        this.ctx.stroke();
        this.ctx.restore();
        this.lastX = data.x2;
        this.lastY = data.y2;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pushHistory();
        socket.emit('clear', { room });
        this.emitCanvasState();
    }

    undo() {
        if (this.historyIndex <= 0) return;
        this.historyIndex -= 1;
        this.loadCanvasState(this.history[this.historyIndex], false);
        socket.emit('undo', { room });
        this.emitCanvasState();
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        this.historyIndex += 1;
        this.loadCanvasState(this.history[this.historyIndex], false);
        socket.emit('redo', { room });
        this.emitCanvasState();
    }

    savePng() {
        const link = document.createElement('a');
        link.href = this.getCanvasDataUrl();
        link.download = `pixelscript-${room}.png`;
        link.click();
    }
}

const canvas = new CollaborationCanvas('drawing-canvas');
const drawingTools = document.getElementById('drawing-tools');
const toolbarToggle = document.getElementById('toolbar-toggle');
const gridOverlay = document.getElementById('canvas-grid');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-message');
const minimizeBtn = document.querySelector('.minimize-btn');
const chatContainer = document.querySelector('.chat-container');
const workspaceUploadButton = document.getElementById('workspace-upload-btn');
const workspaceFileInput = document.getElementById('workspace-file-input');
const projectPanel = document.getElementById('project-panel');
const projectToggle = document.getElementById('project-toggle');
const storyTitleInput = document.getElementById('story-title-input');
const chapterNumberInput = document.getElementById('chapter-number-input');
const chapterTitleInput = document.getElementById('chapter-title-input');
const storySynopsisInput = document.getElementById('story-synopsis-input');
const storyContentInput = document.getElementById('story-content-input');
const panelTitleInput = document.getElementById('panel-title-input');
const saveCurrentPanelButton = document.getElementById('save-current-panel-btn');
const panelsList = document.getElementById('project-panels-list');
const saveProjectButton = document.getElementById('save-project-btn');
const publishRequestButton = document.getElementById('publish-request-btn');
const readerPreviewLink = document.getElementById('reader-preview-link');
const projectStatus = document.getElementById('project-status');

function setProjectPanelCollapsed(collapsed) {
    if (!projectPanel || !projectToggle) {
        return;
    }

    projectPanel.classList.toggle('collapsed', collapsed);
    projectToggle.innerHTML = collapsed
        ? '<i class="fas fa-chevron-left"></i>'
        : '<i class="fas fa-chevron-right"></i>';
    projectToggle.setAttribute('aria-label', collapsed ? 'Open story board' : 'Close story board');
}

function applyWorkspaceRoleAccess() {
    if (canUseDrawingTools) {
        if (drawingTools) {
            drawingTools.style.display = '';
            drawingTools.style.width = drawingTools.classList.contains('collapsed') ? '74px' : '260px';
        }
        if (saveCurrentPanelButton) {
            saveCurrentPanelButton.style.display = '';
            saveCurrentPanelButton.disabled = false;
        }
        if (chapterNumberInput) {
            chapterNumberInput.disabled = false;
        }
        if (chapterTitleInput) {
            chapterTitleInput.disabled = false;
        }
        if (panelTitleInput) {
            panelTitleInput.disabled = false;
        }
        canvas.canvas.style.pointerEvents = 'auto';
        document.querySelectorAll('.tool-btn[data-tool], #color-picker, #size-slider, #opacity-slider, #undo-btn, #redo-btn, #clear-btn, #save-btn, #grid-btn')
            .forEach(control => {
                control.disabled = false;
            });
    } else {
        if (drawingTools) {
            drawingTools.style.display = 'none';
        }
        if (saveCurrentPanelButton) {
            saveCurrentPanelButton.style.display = 'none';
            saveCurrentPanelButton.disabled = true;
        }
        if (chapterNumberInput) {
            chapterNumberInput.disabled = true;
        }
        if (chapterTitleInput) {
            chapterTitleInput.disabled = true;
        }
        if (panelTitleInput) {
            panelTitleInput.disabled = true;
        }
        canvas.canvas.style.pointerEvents = 'none';
        document.querySelectorAll('.tool-btn[data-tool], #color-picker, #size-slider, #opacity-slider, #undo-btn, #redo-btn, #clear-btn, #save-btn, #grid-btn')
            .forEach(control => {
                control.disabled = true;
            });
    }
}

applyWorkspaceRoleAccess();

document.querySelectorAll('.tool-btn[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
        if (!isPrimaryUser) return;
        document.querySelectorAll('.tool-btn[data-tool]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        canvas.setTool(button.dataset.tool);
    });
});

document.getElementById('color-picker')?.addEventListener('input', event => {
    canvas.setColor(event.target.value);
});

document.getElementById('size-slider')?.addEventListener('input', event => {
    canvas.setSize(event.target.value);
});

document.getElementById('opacity-slider')?.addEventListener('input', event => {
    canvas.setOpacity(event.target.value);
});

document.getElementById('undo-btn')?.addEventListener('click', () => {
    if (isPrimaryUser) canvas.undo();
});

document.getElementById('redo-btn')?.addEventListener('click', () => {
    if (isPrimaryUser) canvas.redo();
});

document.getElementById('clear-btn')?.addEventListener('click', () => {
    if (isPrimaryUser && confirm('Clear the canvas for everyone in this room?')) {
        canvas.clear();
    }
});

document.getElementById('save-btn')?.addEventListener('click', () => {
    if (isPrimaryUser) canvas.savePng();
});

document.getElementById('grid-btn')?.addEventListener('click', event => {
    gridOverlay?.classList.toggle('visible');
    event.currentTarget.classList.toggle('active', gridOverlay?.classList.contains('visible'));
});

toolbarToggle?.addEventListener('click', () => {
    drawingTools.classList.toggle('collapsed');
    const expanded = !drawingTools.classList.contains('collapsed');
    drawingTools.style.width = expanded ? '260px' : '74px';
    toolbarToggle.innerHTML = expanded
        ? '<i class="fas fa-chevron-left"></i>'
        : '<i class="fas fa-chevron-right"></i>';
});

minimizeBtn?.addEventListener('click', () => {
    chatContainer.classList.toggle('minimized');
    minimizeBtn.innerHTML = chatContainer.classList.contains('minimized')
        ? '<i class="fas fa-plus"></i>'
        : '<i class="fas fa-minus"></i>';
});

workspaceUploadButton?.addEventListener('click', () => {
    workspaceFileInput?.click();
});

workspaceFileInput?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) {
        uploadWorkspaceAsset(file);
    }
    event.target.value = '';
});

projectToggle?.addEventListener('click', () => {
    setProjectPanelCollapsed(!projectPanel?.classList.contains('collapsed'));
});

chapterNumberInput?.addEventListener('input', () => updateWorkspacePresence(1));
chapterTitleInput?.addEventListener('input', () => updateWorkspacePresence(1));
saveProjectButton?.addEventListener('click', saveCollaborationProject);
publishRequestButton?.addEventListener('click', requestPublishApproval);
saveCurrentPanelButton?.addEventListener('click', saveCurrentPanel);
panelsList?.addEventListener('click', async event => {
    const removeButton = event.target.closest('[data-remove-panel]');
    if (!removeButton) {
        return;
    }

    const panelOrder = Number(removeButton.dataset.removePanel);
    savedChapterPanels = normalizeChapterPanels(
        savedChapterPanels.filter(panel => panel.order !== panelOrder)
    );
    renderSavedPanels();
    await syncChapterPanels('Chapter panels updated.');
});

function addMessage(message, type, sender = type === 'sent' ? 'Artist' : 'Writer', shouldPersist = false) {
    const node = document.createElement('div');
    node.classList.add('message', type);
    node.innerHTML = `<strong>${escapeHtml(sender)}:</strong> ${escapeHtml(message)}`;
    chatMessages.appendChild(node);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (shouldPersist) {
        persistedMessages.push({
            sender,
            message,
            sentAt: new Date().toISOString()
        });
        debouncedChatSave();
    }
}

async function loadWorkspace() {
    try {
        const response = await fetch(`/api/workspaces/${room}`);
        if (!response.ok) {
            throw new Error('Failed to load workspace');
        }

        const workspace = await response.json();
        if (workspace.canvasState) {
            canvas.loadCanvasState(workspace.canvasState, false);
            canvas.pushHistory();
        } else if (isPrimaryUser) {
            canvas.pushHistory();
        }

        (workspace.chat || []).forEach(item => {
            persistedMessages.push(item);
            addMessage(item.message, item.sender === 'Artist' ? 'sent' : 'received', item.sender, false);
        });

        renderAssets(workspace.assets || []);
    } catch (error) {
        console.error('Workspace load error:', error);
        renderAssets([]);
        if (isPrimaryUser) {
            canvas.pushHistory();
        }
    }
}

async function uploadWorkspaceAsset(file) {
    if (!file) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadedBy', isPrimaryUser ? 'Artist' : 'Writer');

        const response = await fetch(`/api/workspaces/${room}/assets`, {
            method: 'POST',
            body: formData
        });

        const asset = await response.json();
        if (!response.ok) {
            throw new Error(asset.error || 'Upload failed');
        }

        const currentAssets = document.querySelectorAll('#workspace-assets .asset-item').length;
        if (currentAssets === 1 && document.querySelector('#workspace-assets .asset-item span')?.textContent === 'No saved assets yet.') {
            renderAssets([asset]);
            return;
        }

        const links = Array.from(document.querySelectorAll('#workspace-assets .asset-item')).map(item => ({
            name: item.querySelector('a')?.textContent || '',
            url: item.querySelector('a')?.getAttribute('href') || '#',
            uploadedBy: item.querySelector('span')?.textContent || 'Collaborator'
        })).filter(item => item.name);

        renderAssets([...links, asset]);
    } catch (error) {
        console.error('Asset upload error:', error);
        alert('Failed to upload asset');
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    const sender = isPrimaryUser ? 'Artist' : 'Writer';
    socket.emit('chatMessage', { room, message, sender });
    addMessage(message, 'sent', sender, true);
    messageInput.value = '';
}

sendButton?.addEventListener('click', sendMessage);
messageInput?.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

socket.emit('joinRoom', { room, isPrimaryUser });

socket.on('chatMessage', data => {
    addMessage(data.message, 'received', data.sender || 'Collaborator', false);
});

socket.on('userJoined', data => {
    updateWorkspacePresence(data.userCount);
});

socket.on('userLeft', data => {
    updateWorkspacePresence(data.userCount);
});

socket.on('draw', data => {
    if (isPrimaryUser) return;
    canvas.drawShape(data);
});

socket.on('canvasState', state => {
    if (isPrimaryUser) return;
    canvas.loadCanvasState(state, false);
});

socket.on('clear', () => {
    if (!isPrimaryUser) {
        canvas.ctx.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
    }
});

loadWorkspace();
loadCollaborationDetails();
renderSavedPanels();
setProjectPanelCollapsed(true);
