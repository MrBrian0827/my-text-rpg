const UNLOCK_KEY = 'frontier-rpg-unlocked-v1';

function normalizeCode(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();
}

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
    return normalizeCode(ACCESS_CODE);
}

function getConfigMeta() {
    if (typeof ACCESS_CODE_META === 'undefined') return null;
    return ACCESS_CODE_META;
}

function formatConfigTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function showWrongCodeError() {
    const meta = getConfigMeta();
    const deployedAt = formatConfigTime(meta?.generatedAt);
    const deployHint = deployedAt
        ? `目前頁面載入的是 ${deployedAt} 產生的設定檔。`
        : '如果你剛更新 GitHub Secret，Secret 不會自動重新部署。';

    showGateError(
        `存取碼錯誤，請再試一次。${deployHint}請到 GitHub Actions 重新執行部署，完成後按 Ctrl+Shift+R 強制重新整理。`
    );
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
    const code = normalizeCode(input.value);

    if (code === stored) {
        sessionStorage.setItem(UNLOCK_KEY, '1');
        if (remember) localStorage.setItem(UNLOCK_KEY, '1');
        showApp();
        return;
    }

    showWrongCodeError();
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
