const UNLOCK_KEY = 'frontier-rpg-unlocked-v1';

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

function getAccessCode() {
    if (typeof ACCESS_CODE === 'undefined') return null;
    return String(ACCESS_CODE).trim();
}

function handleUnlock(event) {
    event.preventDefault();

    const stored = getAccessCode();
    if (!stored || stored === 'CHANGE_ME') {
        showGateError('設定檔未載入。請確認 GitHub Actions 已成功部署，或本機已建立 js/config.js。');
        return;
    }

    const input = document.getElementById('gate-code');
    const remember = document.getElementById('gate-remember').checked;
    const code = input.value.trim();

    if (code === stored) {
        sessionStorage.setItem(UNLOCK_KEY, '1');
        if (remember) localStorage.setItem(UNLOCK_KEY, '1');
        showApp();
        return;
    }

    showGateError('存取碼錯誤，請再試一次');
    input.value = '';
    input.focus();
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#gate-panel form');
    if (form) form.addEventListener('submit', handleUnlock);

    if (getAccessCode() === null) {
        showGateError('找不到 config.js，請確認已完成部署。');
    } else if (isUnlocked()) {
        showApp();
    } else {
        document.getElementById('gate-code').focus();
    }
});
