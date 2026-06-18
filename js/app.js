let sessionApiKey = '';
const SAVE_FORMAT = 'frontier-rpg-save';
const SAVE_VERSION = 1;
let currentGameMeta = null;

function getSaveButton() {
    return document.getElementById('download-save-btn');
}

function updateSaveButton() {
    const btn = getSaveButton();
    if (btn) btn.disabled = chatHistory.length === 0;
}

function ensureActionForm() {
    const form = document.getElementById('action-form');
    if (!form || document.getElementById('player-action')) return;

    form.innerHTML = `
        <label for="player-action" class="sr-only">你的下一步</label>
        <textarea id="player-action" rows="2" placeholder="描述你的行動：偵查、交涉、埋伏、施法、撤退，或任何你想嘗試的做法……" required></textarea>
        <button type="submit" class="btn-write" id="submit-btn">執行行動</button>
    `;
}

async function startAdventure() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const playerName = document.getElementById('playerName').value.trim() || '無名者';
    const playerClass = document.getElementById('playerClass').value;
    const questStyle = document.getElementById('questStyle').value;

    if (!apiKey) { alert('請先輸入 API 金鑰'); return; }

    sessionApiKey = apiKey;
    currentGameMeta = {
        playerName,
        playerClass,
        questStyle,
        startedAt: new Date().toISOString(),
    };

    document.getElementById('setup-panel').hidden = true;
    document.getElementById('game-panel').hidden = false;

    clearLog();
    playerStatus = { energy: 0, insight: 0, rapport: 0, savings: 0 };
    currentMood = '';

    const firstPrompt =
        `玩家角色：【${playerName}】，職業：【${playerClass}】。` +
        `第一份委託類型：【${questStyle}】。` +
        `請以主持人身分建立開場場景，讓玩家已經抵達邊境公會或委託地附近。` +
        `第一回合的 change 欄位請填入合理初始數值（作為起點，非增減）。`;

    chatHistory = [{ role: 'user', parts: [{ text: firstPrompt }] }];
    updateSaveButton();

    renderLoading();
    await processTurn(apiKey, true);
}

async function submitAction(event) {
    event.preventDefault();

    const input = document.getElementById('player-action');
    const action = input.value.trim();
    if (!action) return;

    input.value = '';
    appendLog('user', action);

    const statusNote =
        `（當前：體力 ${playerStatus.energy}、警覺 ${playerStatus.insight}、` +
        `聲望 ${playerStatus.rapport}、銀幣 ${playerStatus.savings}）`;

    chatHistory.push({
        role: 'user',
        parts: [{ text: `玩家宣告行動：【${action}】${statusNote}。請判定行動結果並推進下一段。` }],
    });

    renderLoading();
    await processTurn(sessionApiKey, false);
}

async function processTurn(apiKey, isFirstTurn) {
    try {
        const rawJson = await callGeminiAPI(apiKey, chatHistory, GAME_SYSTEM_INSTRUCTION);
        chatHistory.push({ role: 'model', parts: [{ text: rawJson }] });

        let data;
        try {
            data = JSON.parse(rawJson);
        } catch (_) {
            throw new Error('AI 回傳格式異常，請再試一次。');
        }

        if (isFirstTurn) {
            playerStatus.energy = data.energy_change ?? 80;
            playerStatus.insight = data.insight_change ?? 50;
            playerStatus.rapport = data.rapport_change ?? 50;
            playerStatus.savings = data.savings_change ?? 30;
        } else {
            playerStatus.energy = Math.max(0, playerStatus.energy + (data.energy_change || 0));
            playerStatus.insight = Math.max(0, playerStatus.insight + (data.insight_change || 0));
            playerStatus.rapport = Math.max(0, playerStatus.rapport + (data.rapport_change || 0));
            playerStatus.savings = Math.max(0, playerStatus.savings + (data.savings_change || 0));
        }

        currentMood = data.mood || currentMood;
        updateUI();

        removeLastSystemLog('正在續寫……');

        if (playerStatus.energy <= 0) {
            appendLog('end', `${data.entry}\n\n任務失敗，冒險者被迫退出這次委託。`);
            setFormEnabled(false);
            const form = document.getElementById('action-form');
            form.innerHTML = '<button type="button" class="btn-restart" onclick="location.reload()">重新建立角色</button>';
            updateSaveButton();
            return;
        }

        appendLog('ai', data.entry);
        setFormEnabled(true);
        updateSaveButton();
        document.getElementById('player-action').focus();

    } catch (err) {
        removeLastSystemLog('正在續寫……');

        appendLog('error', `發生錯誤：${err.message}`);
        setFormEnabled(true);
        updateSaveButton();

        const form = document.getElementById('action-form');
        const oldBtn = form.querySelector('.btn-restart');
        if (!oldBtn) {
            const restart = document.createElement('button');
            restart.type = 'button';
            restart.className = 'btn-restart';
            restart.textContent = '重新整理';
            restart.style.marginTop = '0.5rem';
            restart.style.width = '100%';
            restart.onclick = () => location.reload();
            form.appendChild(restart);
        }
    }
}

function createSaveData() {
    if (!chatHistory.length) {
        throw new Error('目前還沒有可下載的遊戲進度。');
    }

    return {
        format: SAVE_FORMAT,
        version: SAVE_VERSION,
        savedAt: new Date().toISOString(),
        model: typeof GEMINI_MODEL === 'string' ? GEMINI_MODEL : '',
        apiKey: sessionApiKey,
        meta: currentGameMeta || {},
        playerStatus,
        currentMood,
        chatHistory,
        gameLog,
    };
}

function downloadSave() {
    try {
        const save = createSaveData();
        const payload = JSON.stringify(save, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
        const link = document.createElement('a');

        link.href = url;
        link.download = `frontier-rpg-save-${stamp}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        appendLog('system', '已下載存檔。請妥善保管，這個檔案包含你的 Gemini API key。');
    } catch (err) {
        alert(err.message || '下載存檔失敗。');
    }
}

function openSavePicker() {
    const input = document.getElementById('save-file-input');
    input.value = '';
    input.click();
}

function assertValidSave(save) {
    if (!save || save.format !== SAVE_FORMAT) {
        throw new Error('這不是邊境委託所的存檔檔案。');
    }
    if (save.version !== SAVE_VERSION) {
        throw new Error(`存檔版本不支援：${save.version}`);
    }
    if (!save.apiKey || typeof save.apiKey !== 'string') {
        throw new Error('存檔內沒有 API key，無法直接繼續遊戲。');
    }
    if (!Array.isArray(save.chatHistory) || save.chatHistory.length === 0) {
        throw new Error('存檔內沒有可恢復的對話紀錄。');
    }
}

function normalizeStatus(status) {
    const safe = status && typeof status === 'object' ? status : {};
    return {
        energy: Number(safe.energy) || 0,
        insight: Number(safe.insight) || 0,
        rapport: Number(safe.rapport) || 0,
        savings: Number(safe.savings) || 0,
    };
}

function loadSaveData(save) {
    assertValidSave(save);

    sessionApiKey = save.apiKey.trim();
    currentGameMeta = save.meta || {};
    chatHistory = save.chatHistory;
    playerStatus = normalizeStatus(save.playerStatus);
    currentMood = typeof save.currentMood === 'string' ? save.currentMood : '';

    document.getElementById('apiKey').value = sessionApiKey;
    document.getElementById('setup-panel').hidden = true;
    document.getElementById('game-panel').hidden = false;

    ensureActionForm();
    restoreLog(save.gameLog || []);
    updateUI();
    setFormEnabled(playerStatus.energy > 0);
    updateSaveButton();

    const savedAt = save.savedAt ? new Date(save.savedAt).toLocaleString('zh-TW') : '未知時間';
    appendLog('system', `已載入存檔（${savedAt}）。API key 已從存檔帶入，可以直接繼續行動。`);
    document.getElementById('player-action')?.focus();
}

async function importSaveFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const save = JSON.parse(text);
        loadSaveData(save);
    } catch (err) {
        alert(`載入存檔失敗：${err.message || err}`);
    }
}

document.getElementById('save-file-input')?.addEventListener('change', importSaveFile);
updateSaveButton();
