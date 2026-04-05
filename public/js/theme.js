// public/js/theme.js
(function() {
    const savedTheme = localStorage.getItem('codecollab_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
    } else if (savedTheme === 'solarized-light') {
        document.documentElement.classList.add('solarized-light-theme');
    } else if (savedTheme === 'solarized-dark') {
        document.documentElement.classList.add('solarized-dark-theme');
    } else {
        document.documentElement.classList.add('light-theme');
    }
    // Note: 'light-dark-editor' applies 'light-theme' to the UI
})();
