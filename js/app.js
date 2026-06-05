window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('my_gemini_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
});

async function startAdventure() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const world = document.getElementById('worldSetting').value.trim() || "現代都市生存";
    const pClass = document.getElementById('playerClass').value.trim() || "普通市民";
    
    // 獲取玩家選取的模式
    currentMode = document.getElementById('gameMode').value;

    if (!apiKey) { alert('請先輸入你的 Gemini API 金鑰！'); return; }

    localStorage.setItem('my_gemini_api_key', apiKey);

    // 切換面板並更新標籤
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('game-panel').style.display = 'block';
    document.getElementById('mode-badge').innerText = currentMode === "DND" ? "🎲 D&D 跑團模式" : "📖 AI 小說模式";
    
    renderLoading();

    let firstPrompt = "";
    if (currentMode === "DND") {
        firstPrompt = `我創造了一個 DND 跑團世界觀：【${world}】，我的職業是：【${pClass}】。請為我分配初始數值，並生成第一個需要 D20 骰點檢定的開場事件與三個選項。`;
    } else {
        firstPrompt = `我創造了一個小說世界觀：【${world}】，我是小說的主角，身份是：【${pClass}】。請為我分配合理的初始數值，並展開充滿懸念的小說第一章序幕與三個前進選項。`;
    }
    
    chatHistory = [{ role: 'user', parts: [{ text: firstPrompt }] }];
    playerStatus = { hp: 0, atk: 0, def: 0, gold: 0 };
    
    await processTurn(apiKey, true);
}

async function selectOption(optionText) {
    const apiKey = document.getElementById('apiKey').value.trim();
    renderLoading();
    
    let nextPrompt = "";
    if (currentMode === "DND") {
        nextPrompt = `我選擇了行動：【${optionText}】。請在幕後秘密投擲 D20 骰子判定此行動成功與否，並結合我的狀態（HP:${playerStatus.hp}, ATK:${playerStatus.atk}, DEF:${playerStatus.def}, GOLD:${playerStatus.gold}）精算傷害結果，給出後續劇情與新的三個選項。`;
    } else {
        nextPrompt = `小說情節推進，我決定：【${optionText}】。請根據我的選擇，寫出下一段精彩的小說故事，並給予我合理的劇情狀態變動值與新的三個抉擇。`;
    }
    
    chatHistory.push({ role: 'user', parts: [{ text: nextPrompt }] });
    await processTurn(apiKey, false);
}

async function processTurn(apiKey, isFirstTurn) {
    try {
        // 核心：根據目前選擇的模式，傳送不同的系統 Prompt 給 Gemini
        const instruction = currentMode === "DND" ? DND_PROMPT : NOVEL_PROMPT;
        
        const rawJson = await callGeminiAPI(apiKey, chatHistory, instruction);
        chatHistory.push({ role: 'model', parts: [{ text: rawJson }] });
        
        const gameData = JSON.parse(rawJson);
        
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
        
        if (playerStatus.hp <= 0) {
            document.getElementById('story-text').innerHTML = `💀 <b>【冒險結束】</b>\n\n${gameData.story}\n\n你已經不幸陣亡！`;
            document.getElementById('options-container').innerHTML = `<button onclick="location.reload()" style="background:#dc3545;">重新開始新冒險</button>`;
            return;
        }

        document.getElementById('story-text').innerText = gameData.story;
        
        let optionsHtml = '';
        gameData.options.forEach(opt => {
            optionsHtml += `<button class="option-btn" onclick="selectOption('${opt.replace(/'/g, "\\'")}')">👉 ${opt}</button>`;
        });
        document.getElementById('options-container').innerHTML = optionsHtml;
        
    } catch (err) {
        document.getElementById('story-text').innerText = `系統連線錯誤：${err.message}\n請檢查您的金鑰或嘗試重新整理。`;
        document.getElementById('options-container').innerHTML = `<button onclick="location.reload()">重新整理</button>`;
    }
}
