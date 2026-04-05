document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const token = localStorage.getItem('codecollab_token');
    const username = localStorage.getItem('codecollab_username');

    if (!token || !username) {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('welcome-msg').textContent = `Welcome, ${username}`;

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('codecollab_token');
        localStorage.removeItem('codecollab_username');
        window.location.href = '/index.html';
    });

    document.getElementById('create-room-btn').addEventListener('click', () => {
        // Generate random 6 character room ID
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        window.location.href = `/room.html?id=${roomId}`;
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        const errorEl = document.getElementById('join-error');

        if (!roomId) {
            errorEl.textContent = 'Please enter a Room ID';
            return;
        }

        window.location.href = `/room.html?id=${roomId}`;
    });
});
