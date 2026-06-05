let sessionApiKey = '';

async function startAdventure() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const world = document.getElementById('worldSetting').value.trim() || '一座尚未被說完的城市';
    const protagonist = document.getElementById('playerClass').value.trim() || '無名旅人';

    if (!apiKey) { alert('請先輸入 API 金鑰'); return; }

    sessionApiKey = apiKey;

    document.getElementById('setup-panel').hidden = true;
    document.getElementById('game-panel').hidden = false;

    document.getElementById('narrative-log').innerHTML = '';
    playerStatus = { energy: 0, insight: 0, rapport: 0, savings: 0 };
    currentMood = '';

    const firstPrompt =
        `故事舞台：【${world}】。主角：【${protagonist}】。` +
        `請寫下開場第一段連載，並在 change 欄位填入合理的初始數值（作為起點，非增減）。`;

    chatHistory = [{ role: 'user', parts: [{ text: firstPrompt }] }];

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
        `（當前：精力 ${playerStatus.energy}、靈感 ${playerStatus.insight}、` +
        `信譽 ${playerStatus.rapport}、積蓄 ${playerStatus.savings}）`;

    chatHistory.push({
        role: 'user',
        parts: [{ text: `主角的行動：【${action}】${statusNote}。請續寫下一段。` }],
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

        // 移除「正在續寫」提示
        const log = document.getElementById('narrative-log');
        const loading = log.querySelector('.log-entry--system:last-child');
        if (loading?.textContent === '正在續寫……') loading.remove();

        if (playerStatus.energy <= 0) {
            appendLog('end', `${data.entry}\n\n—— 故事在此告一段落。`);
            setFormEnabled(false);
            const form = document.getElementById('action-form');
            form.innerHTML = '<button type="button" class="btn-restart" onclick="location.reload()">開啟新故事</button>';
            return;
        }

        appendLog('ai', data.entry);
        setFormEnabled(true);
        document.getElementById('player-action').focus();

    } catch (err) {
        const log = document.getElementById('narrative-log');
        const loading = log.querySelector('.log-entry--system:last-child');
        if (loading?.textContent === '正在續寫……') loading.remove();

        appendLog('error', `發生錯誤：${err.message}`);
        setFormEnabled(true);

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
