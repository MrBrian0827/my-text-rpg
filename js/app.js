// 網頁載入完成後，自動從本機 localStorage 讀取金鑰
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('my_gemini_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
});

// 啟動全新冒險
async function startAdventure() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const world = document.getElementById('worldSetting').value.trim() || "標準 D&D 奇幻世界觀";
    const pClass = document.getElementById('playerClass').value.trim() || "冒險者公會新人";

    if (!apiKey) { alert('請先輸入你的 Gemini API 金鑰！'); return; }

    localStorage.setItem('my_gemini_api_key', apiKey);

    // 切換面板顯示
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('game-panel').style.display = 'block';
    
    renderLoading();

    // 建構給 D&D 主機的第一回合 Prompt
    const firstPrompt = `我創造了一個 D&D 跑團世界觀：【${world}】。我的初始職業/身份是：【${pClass}】。請根據這兩個設定，為我分配合理的初始數值（請在 JSON 的 change 欄位直接填入初始值，例如 hp_change 填入初始血量、atk_change 填入初始攻擊修正等），並生成開場隨機冒險遭遇事件與三個初始行動選項。`;
    chatHistory = [{ role: 'user', parts: [{ text: firstPrompt }] }];
    
    playerStatus = { hp: 0, atk: 0, def: 0, gold: 0 };
    
    await processTurn(apiKey, true);
}

// 玩家點擊選項時觸發的函式
async function selectOption(optionText) {
    const apiKey = document.getElementById('apiKey').value.trim();
    renderLoading();
    
    const nextPrompt = `我決定採取的行動是：【${optionText}】。請在幕後秘密投擲 D20 骰子進行這項行動的成功檢定，並結合我的當前實際狀態（HP:${playerStatus.hp}, ATK:${playerStatus.atk}, DEF:${playerStatus.def}, GOLD:${playerStatus.gold}）精算傷害或利益，給出後續劇情與新的三個選項。`;
    chatHistory.push({ role: 'user', parts: [{ text: nextPrompt }] });
    
    await processTurn(apiKey, false);
}

// 回合計算控制
async function processTurn(apiKey, isFirstTurn) {
    try {
        const rawJson = await callGeminiAPI(apiKey, chatHistory, GAME_SYSTEM_INSTRUCTION);
        chatHistory.push({ role: 'model', parts: [{ text: rawJson }] });
        
        const gameData = JSON.parse(rawJson);
        
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
            document.getElementById('story-text').innerHTML = `💀 <b>【冒險者不幸陣亡】</b>\n\n${gameData.story}\n\n你的生命跡象已消失。在殘酷的世界中，你的名字將被遺忘...`;
            document.getElementById('options-container').innerHTML = `<button onclick="location.reload()" style="background:#dc3545;">重新投胎，開啟新冒險</button>`;
            return;
        }

        // 渲染文本與選項
        document.getElementById('story-text').innerText = gameData.story;
        
        let optionsHtml = '';
        gameData.options?.forEach(opt => {
            optionsHtml += `<button class="option-btn" onclick="selectOption('${opt.replace(/'/g, "\\'")}')">👉 ${opt}</button>`;
        });
        document.getElementById('options-container').innerHTML = optionsHtml;
        
    } catch (err) {
        document.getElementById('story-text').innerText = `連線出錯：${err.message}\n請確認金鑰正確、未開防追蹤阻擋，或點擊下方按鈕重試。`;
        document.getElementById('options-container').innerHTML = `<button onclick="location.reload()">重新整理網頁</button>`;
    }
}
