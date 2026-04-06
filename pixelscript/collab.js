// Canvas Setup
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing State
let isDrawing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let currentSize = 5;
let lastX = 0;
let lastY = 0;

// Tool Selection
const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
toolButtons.forEach(button => {
    button.addEventListener('click', () => {
        toolButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentTool = button.dataset.tool;
    });
});

// Color Picker
const colorPicker = document.getElementById('color-picker');
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

// Size Slider
const sizeSlider = document.getElementById('size-slider');
sizeSlider.addEventListener('input', (e) => {
    currentSize = e.target.value;
});

// Drawing Functions
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
}

function draw(e) {
    if (!isDrawing) return;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    [lastX, lastY] = [e.offsetX, e.offsetY];
}

// Event Listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Chat Functionality
const chatInput = document.querySelector('.chat-input input');
const sendButton = document.querySelector('.send-btn');
const chatMessages = document.querySelector('.chat-messages');

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
            <div class="message-content">
                <span class="message-sender">You</span>
                <p>${message}</p>
            </div>
            <img src="images/user-2.png" alt="You" class="message-avatar">
        `;
        chatMessages.appendChild(messageElement);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Save and Export
const saveButton = document.getElementById('save-btn');
const exportButton = document.getElementById('export-btn');

saveButton.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'pixelscript-drawing.png';
    link.href = dataURL;
    link.click();
});

exportButton.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'pixelscript-export.png';
    link.href = dataURL;
    link.click();
});

// Minimize Chat
const minimizeButton = document.querySelector('.minimize-btn');
const chatSection = document.querySelector('.chat-section');

minimizeButton.addEventListener('click', () => {
    chatSection.classList.toggle('minimized');
}); 