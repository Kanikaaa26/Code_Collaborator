const token = localStorage.getItem('codecollab_token');
const username = localStorage.getItem('codecollab_username');
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');

if (!token || !username || !roomId) {
    window.location.href = '/dashboard.html';
}

document.getElementById('display-room-id').textContent = roomId;
document.getElementById('user-badge').textContent = username;

const socket = io();
let editor;
let isEditorUpdatingFromRemote = false;
let remoteCursors = {}; // cursor decorations

// Color generator for cursors
const colors = ['#f56565', '#48bb78', '#4299e1', '#ed8936', '#9f7aea', '#ecc94b'];
function getUserColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// Ensure Monaco loader is loaded
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
    
    // Define Solarized Light Theme for Monaco
    monaco.editor.defineTheme('solarized-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { background: 'fdf6e3' }
        ],
        colors: {
            'editor.background': '#fdf6e3',
            'editor.foreground': '#073642',
            'editor.lineHighlightBackground': '#eee8d5',
            'editorLineNumber.foreground': '#93a1a1',
            'editorIndentGuide.background': '#eee8d5',
            'editorCursor.foreground': '#268bd2'
        }
    });

    // Define Solarized Dark Theme for Monaco
    monaco.editor.defineTheme('solarized-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { background: '002b36' }
        ],
        colors: {
            'editor.background': '#002b36',
            'editor.foreground': '#eee8d5',
            'editor.lineHighlightBackground': '#073642',
            'editorLineNumber.foreground': '#586e75',
            'editorIndentGuide.background': '#073642',
            'editorCursor.foreground': '#268bd2'
        }
    });

    let initialTheme = 'vs';
    const savedTheme = localStorage.getItem('codecollab_theme') || 'light';
    if (savedTheme === 'dark' || savedTheme === 'light-dark-editor') initialTheme = 'vs-dark';
    if (savedTheme === 'solarized-light') initialTheme = 'solarized-light';
    if (savedTheme === 'solarized-dark') initialTheme = 'solarized-dark';

    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '// Start coding here...\n',
        language: 'javascript',
        theme: initialTheme,
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'Fira Code, monospace',
        minimap: { enabled: false }
    });

    socket.emit('join-room', roomId, username);

    // Code changes
    editor.onDidChangeModelContent((event) => {
        if (!isEditorUpdatingFromRemote) {
            socket.emit('code-change', editor.getValue());
        }
    });

    // Cursor movement tracking
    editor.onDidChangeCursorPosition((event) => {
        socket.emit('cursor-move', {
            lineNumber: event.position.lineNumber,
            column: event.position.column
        });
    });

    // Typing indication
    let typingTimer;
    editor.onKeyDown(() => {
        socket.emit('typing-start');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => socket.emit('typing-stop'), 1000);
    });
});

// Handling incoming Socket.IO events for Editor
socket.on('code-change', (data) => {
    if (editor && editor.getValue() !== data) {
        isEditorUpdatingFromRemote = true;
        const position = editor.getPosition();
        editor.setValue(data);
        editor.setPosition(position);
        isEditorUpdatingFromRemote = false;
    }
});

// Remote cursor css class injection
const cursorStyles = document.createElement('style');
document.head.appendChild(cursorStyles);

socket.on('cursor-move', (data) => {
    if (!editor) return;
    const { id, username: remoteUser, lineNumber, column } = data;

    // Add custom style for this user if not present
    if (!remoteCursors[id]) {
        const color = getUserColor(remoteUser);
        cursorStyles.innerHTML += `
            .remote-cursor-${id} { border-left: 2px solid ${color}; position: absolute; height: 1.2em; pointer-events: none; z-index: 10;}
            .remote-cursor-flag-${id} { position: absolute; top: -18px; left: 0; background-color: ${color}; color: white; font-size: 10px; padding: 2px 4px; border-radius: 4px; white-space: nowrap; pointer-events: none; z-index: 10;}
        `;
    }

    const position = { lineNumber, column };

    remoteCursors[id] = editor.createDecorationsCollection([
        {
            range: new monaco.Range(lineNumber, column, lineNumber, column),
            options: {
                className: `remote-cursor-${id}`,
                hoverMessage: { value: remoteUser },
                beforeContentClassName: `remote-cursor-flag-${id}`,
                before: {
                    content: remoteUser,
                }
            }
        }
    ]);
});

// Language Switcher
document.getElementById('language-select').addEventListener('change', (e) => {
    if (editor) {
        monaco.editor.setModelLanguage(editor.getModel(), e.target.value);
    }
});

// Theme Switcher
const themeSelector = document.getElementById('theme-selector');
if (themeSelector) {
    const defaultTheme = localStorage.getItem('codecollab_theme') || 'light';
    themeSelector.value = defaultTheme;
    
    themeSelector.addEventListener('change', (e) => {
        const selected = e.target.value;
        localStorage.setItem('codecollab_theme', selected);
        
        // Remove all theme classes first
        document.documentElement.classList.remove('light-theme', 'dark-theme', 'solarized-light-theme', 'solarized-dark-theme');
        
        if (selected === 'dark') {
            document.documentElement.classList.add('dark-theme');
        } else if (selected === 'solarized-light') {
            document.documentElement.classList.add('solarized-light-theme');
        } else if (selected === 'solarized-dark') {
            document.documentElement.classList.add('solarized-dark-theme');
        } else {
            // Also applies to 'light-dark-editor'
            document.documentElement.classList.add('light-theme');
        }
    
        if (editor) {
            if (selected === 'solarized-light') {
                monaco.editor.setTheme('solarized-light');
            } else if (selected === 'solarized-dark') {
                monaco.editor.setTheme('solarized-dark');
            } else {
                monaco.editor.setTheme((selected === 'light' || selected === 'solarized-light') ? 'vs' : 'vs-dark');
            }
        }
    });
}

// Typing Indicator
const typingIndicator = document.getElementById('typing-indicator');
const typingUser = document.getElementById('typing-user');
let hideTypingTimer;

socket.on('typing-start', (data) => {
    typingUser.textContent = data.username;
    typingIndicator.classList.remove('hidden');

    clearTimeout(hideTypingTimer);
    hideTypingTimer = setTimeout(() => {
        typingIndicator.classList.add('hidden');
    }, 2000);
});

socket.on('typing-stop', () => {
    typingIndicator.classList.add('hidden');
});

// Chat System
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    socket.emit('chat-message', { text });
    appendMessage(username, text, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    chatInput.value = '';
});

socket.on('chat-message', (data) => {
    appendMessage(data.username, data.text, data.time);
});

socket.on('user-connected', (data) => {
    appendSystemMessage(`${data.username} joined the room.`);
});

socket.on('user-disconnected', (data) => {
    appendSystemMessage(`${data.username} left the room.`);
    // Cleanup cursors
    if (remoteCursors[data.id]) {
        remoteCursors[data.id].clear();
        delete remoteCursors[data.id];
    }
    // Cleanup Peer
    if (peers[data.id]) {
        peers[data.id].destroy();
        delete peers[data.id];
    }
});

function appendMessage(user, text, time) {
    const el = document.createElement('div');
    el.className = 'message';
    el.innerHTML = `
        <div class="message-header">
            <span class="message-user">${user}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${text}</div>
    `;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'message';
    el.innerHTML = `<div class="message-content" style="color: var(--text-muted); font-style: italic;">${text}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Run Code Demo
document.getElementById('run-btn').addEventListener('click', async () => {
    const outputEl = document.getElementById('console-output');
    outputEl.textContent = 'Executing...';

    try {
        const res = await fetch('/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: editor.getValue(),
                language: document.getElementById('language-select').value
            })
        });
        const data = await res.json();
        outputEl.textContent = data.output || 'Execution finished with no output.';
    } catch (err) {
        outputEl.textContent = 'Error executing code: ' + err.message;
    }
});

document.getElementById('leave-btn').addEventListener('click', () => {
    window.location.href = '/dashboard.html';
});

// --- WebRTC Voice Chat Implementation ---
const voiceBtn = document.getElementById('voice-btn');
const muteBtn = document.getElementById('mute-btn');
const remoteAudio = document.getElementById('remote-audio');
let localStream = null;
let peers = {}; // id -> Peer

socket.on('user-connected', (data) => {
    if (localStream) {
        createPeer(data.id, true, localStream);
    }
});

socket.on('signal', (data) => {
    // data.from is id of sender
    const peerId = data.from;

    if (!peers[peerId] && localStream) {
        createPeer(peerId, false, localStream);
    }

    if (peers[peerId]) {
        peers[peerId].signal(data.signal);
    }
});

function createPeer(partnerId, initiator, stream) {
    const peer = new SimplePeer({
        initiator: initiator,
        stream: stream,
        trickle: false
    });

    peer.on('signal', (signalData) => {
        socket.emit('signal', {
            to: partnerId,
            signal: signalData
        });
    });

    peer.on('stream', (remoteStream) => {
        remoteAudio.srcObject = remoteStream;
    });

    peer.on('error', (err) => console.log('Peer error:', err));

    peers[partnerId] = peer;
    return peer;
}

voiceBtn.addEventListener('click', async () => {
    if (!localStream) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            voiceBtn.classList.remove('voice-connect');
            voiceBtn.classList.add('voice-disconnect');
            voiceBtn.textContent = 'Disconnect Voice';
            muteBtn.classList.remove('hidden');

            // Notify currently connected users that we are ready to receive connections
            // Here we wait for standard re-negotiation, but for simple-peer usually the initiator is the one 
            // joining late. If we join voice late, we notify the room.
            socket.emit('join-room', roomId, username + "_refresh"); // dirty hack to broadcast user-connected again for WebRTC initiator trick or we can implement custom.

        } catch (err) {
            console.error('Failed to get local stream', err);
            alert('Could not access microphone.');
        }
    } else {
        // Disconnect
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        for (let key in peers) {
            peers[key].destroy();
        }
        peers = {};

        voiceBtn.classList.add('voice-connect');
        voiceBtn.classList.remove('voice-disconnect');
        voiceBtn.textContent = '📞 Join Voice';
        muteBtn.classList.add('hidden');
    }
});

muteBtn.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack.enabled) {
            audioTrack.enabled = false;
            muteBtn.textContent = '🔇 Unmute';
        } else {
            audioTrack.enabled = true;
            muteBtn.textContent = '🎤 Mute';
        }
    }
});

