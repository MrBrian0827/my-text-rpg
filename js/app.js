// 網頁載入完成後，自動從本機 localStorage 讀取金鑰，避免重複輸入，且保障安全不外洩
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('my_gemini_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
});

// 啟動全新冒險
async function startAdventure() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const world = document.getElementById('worldSetting').value.trim() || "現代都市生存";
    const pClass = document.getElementById('playerClass').value.trim() || "普通市民";

    if (!apiKey) { alert('請先輸入你的 Gemini API 金鑰！'); return; }

    // 將金鑰安全地存入本機瀏覽器記憶體中
    localStorage.setItem('my_gemini_api_key', apiKey);

    // 切換面板顯示
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('game-panel').style.display = 'block';
    
    renderLoading();

    // 建構第一回合交給 AI 分配數值的 Prompt
    const firstPrompt = `我創造了一個世界觀：【${world}】。我的初始職業/身份是：【${pClass}】。請根據這兩個設定，為我分配合理的初始數值（請在 JSON 的 change 欄位直接填入初始值，例如 hp_change 填入初始血量、atk_change 填入初始攻擊力等），並生成開場隨機事件與三個選項。`;
    chatHistory = [{ role: 'user', parts: [{ text: firstPrompt }] }];
    
    // 初始化為零，等待 AI 第一回合回傳決定數值
    playerStatus = { hp: 0, atk: 0, def: 0, gold: 0 };
    
    await processTurn(apiKey, true);
}

// 玩家點擊選項時觸發的函式
async function selectOption(optionText) {
    const apiKey = document.getElementById('apiKey').value.trim();
    renderLoading();
    
    const nextPrompt = `我選擇了行動：【${optionText}】。請根據此行動，結合我目前的實際狀態（HP:${playerStatus.hp}, ATK:${playerStatus.atk}, DEF:${playerStatus.def}, GOLD:${playerStatus.gold}），精算傷害與結果，給出後續劇情、狀態變動值與新的三個選項。`;
    chatHistory.push({ role: 'user', parts: [{ text: nextPrompt }] });
    
    await processTurn(apiKey, false);
}

// 核心回合計算控制
async function processTurn(apiKey, isFirstTurn) {
    try {
        // 呼叫 api.js 的通訊功能
        const rawJson = await callGeminiAPI(apiKey, chatHistory, GAME_SYSTEM_INSTRUCTION);
        chatHistory.push({ role: 'model', parts: [{ text: rawJson }] });
        
        // 解析 AI 回傳的標準 JSON 數據
        const gameData = JSON.parse(rawJson);
        
        // 計算並更新數值
        if (isFirstTurn) {
            playerStatus.hp = gameData.hp_change || 100;
            playerStatus.atk = gameData.atk_change || 10;
            playerStatus.def = gameData.def_change || 5;
            playerStatus.gold = gameData.gold_change || 0;
        } else {
            playerStatus.hp = Math.max(0, playerStatus.hp + (gameData.hp_change || 0));
            playerStatus.atk = Math.max(0, playerStatus.atk + (gameData.atk_change || 0));
            playerStatus.def = Math.max(0, playerStatus.def + (gameData.def_change || 0));
            playerStatus.gold = Math.max(0, playerStatus.gold + (gameData.gold_change || 0));
        }
        
        updateUI();
        
        // 處理死亡邏輯
        if (playerStatus.hp <= 0) {
            document.getElementById('story-text').innerHTML = `💀 <b>【冒險結束】</b>\n\n${gameData.story}\n\n你已經不幸陣亡！`;
            document.getElementById('options-container').innerHTML = `<button onclick="location.reload()" style="background:#dc3545;">重新開始新冒險</button>`;
            return;
        }

        // 渲染文本與選項
        document.getElementById('story-text').innerText = gameData.story;
        
        let optionsHtml = '';
        gameData.options.forEach(opt => {
            optionsHtml += `<button class="option-btn" onclick="selectOption('${opt.replace(/'/g, "\\'")}')">👉 ${opt}</button>`;
        });
        document.getElementById('options-container').innerHTML = optionsHtml;
        
    } catch (err) {
        document.getElementById('story-text').innerText = `系統連線錯誤：${err.message}\n請檢查您的金鑰是否正確，或嘗試換個世界觀重新整理。`;
        document.getElementById('options-container').innerHTML = `<button onclick="location.reload()">重新整理</button>`;
    }
}
