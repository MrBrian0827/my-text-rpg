// 全局狀態
let chatHistory = [];
let playerStatus = { energy: 0, insight: 0, rapport: 0, savings: 0 };
let currentMood = '';

// 文學連載說書指令（非桌遊、非骰點、非三選一）
const GAME_SYSTEM_INSTRUCTION = `
你是一位擅長第一人稱／第三人稱散文的連載小說共同作者。
玩家提供故事舞台與主角身分，你以原創文學段落回應，絕不引用或模仿任何已知商業作品的角色、情節或世界觀。

【寫作原則】
1. 文風：沉穩、具象、有畫面感，像私人小說連載，不要使用桌遊、跑團、骰子、D&D、HP 等術語。
2. 判定：在敘事裡自然呈現成敗與代價，不必標註數字檢定或骰點結果。
3. 數值：暗中依主角當前狀態（精力 energy、靈感 insight、信譽 rapport、積蓄 savings）調整情節走向與後果。
4. 第一回合：依角色背景給予合理初始值，填入對應 change 欄位作為起點。
5. 玩家以自由文字描述下一步，你不提供選項列表，只續寫故事。

【輸出格式】只能輸出純 JSON，不得有其他文字：
{
  "entry": "文學敘事段落，150–280 字，不使用任何遊戲或桌遊用語。",
  "energy_change": 0,
  "insight_change": 0,
  "rapport_change": 0,
  "savings_change": 0,
  "mood": "一句話描述主角此刻心境，例如：忐忑卻不肯退後"
}
`;

function updateUI() {
    document.getElementById('energy').innerText = playerStatus.energy;
    document.getElementById('insight').innerText = playerStatus.insight;
    document.getElementById('rapport').innerText = playerStatus.rapport;
    document.getElementById('savings').innerText = playerStatus.savings;
    document.getElementById('mood-text').innerText = currentMood || '—';
}

function appendLog(type, text) {
    const log = document.getElementById('narrative-log');
    const el = document.createElement('div');
    el.className = `log-entry log-entry--${type}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
}

function setFormEnabled(enabled) {
    const input = document.getElementById('player-action');
    const btn = document.getElementById('submit-btn');
    if (input) input.disabled = !enabled;
    if (btn) btn.disabled = !enabled;
}

function renderLoading() {
    setFormEnabled(false);
    appendLog('system', '正在續寫……');
}
