// 【已移除】原本的自動讀取暫存機制已徹底刪除，確保每次進入網頁金鑰欄位皆為空。
// 金鑰僅存於本次遊戲的記憶體，供回合切換使用（不寫入 localStorage）
let sessionApiKey = '';

// 啟動全新冒險
async function startAdventure() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const world = document.getElementById('worldSetting').value.trim() || "霧氣繚繞的邊境奇幻世界";
    const pClass = document.getElementById('playerClass').value.trim() || "初出茅廬的旅人";

    if (!apiKey) { alert('請先輸入你的 Gemini API 金鑰！'); return; }

    sessionApiKey = apiKey;

    // 【已移除】原本的 localStorage.setItem 安全記憶功能已刪除，網頁不會保留任何金鑰紀錄。

    // 切換面板顯示
    document.getElementById('setup-panel').hidden = true;
    document.getElementById('game-panel').hidden = false;
    
    renderLoading();

      const firstPrompt = `我的世界觀設定：【${world}】。我的角色身分是：【${pClass}】。請根據這兩個設定，為我分配合理的初始數值（請在 JSON 的 change 欄位直接填入初始值，例如 hp_change 填入初始血量、atk_change 填入初始攻擊修正等），並生成開場遭遇事件與三個行動選項。`;
    chatHistory = [{ role: 'user', parts: [{ text: firstPrompt }] }];
    
    playerStatus = { hp: 0, atk: 0, def: 0, gold: 0 };
    
    await processTurn(apiKey, true);
}

// 玩家點擊選項時觸發的函式
async function selectOption(optionText) {
    renderLoading();
    
    const nextPrompt = `我決定採取的行動是：【${optionText}】。請在幕後秘密投擲 D20 骰子進行這項行動的成功檢定，並結合我的當前實際狀態（HP:${playerStatus.hp}, ATK:${playerStatus.atk}, DEF:${playerStatus.def}, GOLD:${playerStatus.gold}）精算傷害或利益，給出後續劇情與新的三個選項。`;
    chatHistory.push({ role: 'user', parts: [{ text: nextPrompt }] });
    
    await processTurn(sessionApiKey, false);
}

// 回合計算控制
async function processTurn(apiKey, isFirstTurn) {
    try {
        const rawJson = await callGeminiAPI(apiKey, chatHistory, GAME_SYSTEM_INSTRUCTION);
        chatHistory.push({ role: 'model', parts: [{ text: rawJson }] });
        
        let gameData;
        try {
            gameData = JSON.parse(rawJson);
        } catch (_) {
            throw new Error('AI 回傳格式異常，請重新整理後再試一次。');
        }
        
        // 更新玩家數值
        if (isFirstTurn) {
            playerStatus.hp = gameData.hp_change || 100;
            playerStatus.atk = gameData.atk_change || 5;
            playerStatus.def = gameData.def_change || 5;
            playerStatus.gold = gameData.gold_change || 10;
        } else {
            playerStatus.hp = Math.max(0, playerStatus.hp + (gameData.hp_change || 0));
            playerStatus.atk = Math.max(0, playerStatus.atk + (gameData.atk_change || 0));
            playerStatus.def = Math.max(0, playerStatus.def + (gameData.def_change || 0));
            playerStatus.gold = Math.max(0, playerStatus.gold + (gameData.gold_change || 0));
        }
        
        updateUI();
        
        // 判定死亡（HP歸零）
        if (playerStatus.hp <= 0) {
            document.getElementById('story-text').innerHTML =
                `<span class="death-title">旅途終結</span>${gameData.story}\n\n你的故事在此畫下句點，邊境的風仍會繼續吹拂……`;
            document.getElementById('options-container').innerHTML =
                `<button class="btn-danger" onclick="location.reload()">重新開始新故事</button>`;
            return;
        }

        // 渲染文本與選項
        document.getElementById('story-text').innerText = gameData.story;
        
        let optionsHtml = '';
        gameData.options?.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            optionsHtml += `<button class="option-btn" data-index="${letter}" onclick="selectOption('${opt.replace(/'/g, "\\'")}')">${opt}</button>`;
        });
        document.getElementById('options-container').innerHTML = optionsHtml;
        
    } catch (err) {
        document.getElementById('story-text').innerText = `發生錯誤：${err.message}`;
        document.getElementById('options-container').innerHTML =
            `<button class="btn-ghost" onclick="location.reload()">重新整理頁面</button>`;
    }
}
