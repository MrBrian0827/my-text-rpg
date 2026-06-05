const UNLOCK_KEY = 'nightway-unlocked';

function isUnlocked() {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
        || localStorage.getItem(UNLOCK_KEY) === '1';
}

function showApp() {
    document.getElementById('gate-panel').hidden = true;
    document.getElementById('app-content').hidden = false;
}

function showGateError(msg) {
    const el = document.getElementById('gate-error');
    el.textContent = msg;
    el.hidden = false;
}

function handleUnlock(event) {
    event.preventDefault();

    const input = document.getElementById('gate-code');
    const remember = document.getElementById('gate-remember').checked;
    const code = input.value.trim();

    if (typeof ACCESS_CODE === 'undefined' || ACCESS_CODE === 'CHANGE_ME') {
        showGateError('存取碼尚未設定。本機請複製 config.example.js 為 config.js；線上請在 GitHub Secrets 設定 ACCESS_CODE。');
        return;
    }

    if (code === ACCESS_CODE) {
        sessionStorage.setItem(UNLOCK_KEY, '1');
        if (remember) localStorage.setItem(UNLOCK_KEY, '1');
        showApp();
        return;
    }

    showGateError('存取碼錯誤');
    input.value = '';
    input.focus();
}

document.addEventListener('DOMContentLoaded', () => {
    if (isUnlocked()) {
        showApp();
    } else {
        document.getElementById('gate-code').focus();
    }
});
