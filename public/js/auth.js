document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const token = localStorage.getItem('codecollab_token');
    if (token) {
        window.location.href = '/dashboard.html';
        return;
    }

    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('codecollab_token', data.token);
                localStorage.setItem('codecollab_username', data.username);
                window.location.href = '/dashboard.html';
            } else {
                errorEl.textContent = data.message;
            }
        } catch (err) {
            errorEl.textContent = 'Server error. Please try again.';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');
        errorEl.textContent = '';

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();

            if (res.ok) {
                // Auto login or prompt to login
                toggleAuth('login');
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = password;
                document.getElementById('login-error').textContent = 'Account created! Logging in...';
                errorEl.style.color = 'var(--success)';

                // Auto login after 1 sec
                setTimeout(() => {
                    loginForm.dispatchEvent(new Event('submit'));
                }, 1000);
            } else {
                errorEl.textContent = data.message;
            }
        } catch (err) {
            errorEl.textContent = 'Server error. Please try again.';
        }
    });
});

function toggleAuth(type) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (type === 'register') {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    } else {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
}
