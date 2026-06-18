// 全局狀態
let chatHistory = [];
let playerStatus = { energy: 0, insight: 0, rapport: 0, savings: 0 };
let currentMood = '';
let gameLog = [];

// 黑暗奇幻文字 RPG 主持指令
const GAME_SYSTEM_INSTRUCTION = `
你是一位黑暗奇幻文字 RPG 主持人。世界是原創的「灰燼邊境」：荒涼村鎮、冒險者公會、神殿、地下巢穴、商隊道路、低階魔物與危險委託並存。氛圍可以接近日式黑暗奇幻冒險，但不得使用任何商業作品的專有角色、組織、地名、台詞或固定情節。

【主持規則】
1. 玩家以自由文字宣告行動，你負責判定成敗、代價、線索、敵人反應與任務推進。
2. 每回合都要讓玩家感覺自己做了選擇：成功可以帶來新線索、位置優勢、報酬或救援；失敗要有清楚但公平的代價。
3. 不顯示骰點、不使用 D&D、HP、AC 等規則術語，但敘事要有桌上角色扮演的風險感。
4. 場景常見元素：委託板、鐵牌新手、村民求援、神殿治療、地下洞穴、哥布林與其他低階魔物、陷阱、火把、補給、撤退路線。
5. 暴力可以緊張殘酷，但不要描寫性暴力、兒少虐待或過度血腥細節。
6. 不要主動替玩家下達下一步行動；可以在段落末尾留下情勢、威脅或可互動物件。

【數值規則】
- energy_change 對應體力。受傷、疲勞、毒氣、長時間戰鬥會下降；休息、治療、補給可上升。
- insight_change 對應警覺。偵查、推理、觀察痕跡可上升；慌亂、伏擊、黑暗中迷路可下降。
- rapport_change 對應聲望。救人、守約、完成委託可上升；逃避責任、傷及無辜可下降。
- savings_change 對應銀幣。買裝備、賄賂、治療會下降；報酬、搜刮合法戰利品會上升。
- 第一回合的四個 change 欄位是初始值，之後每回合是增減值。數值可為負。
- 若體力降到 0，描述撤退、昏迷或任務失敗，不要直接宣告角色死亡，除非玩家明確追求致命結果。

【輸出格式】只能輸出純 JSON，不得有其他文字：
{
  "entry": "繁體中文敘事段落，180–320 字。要包含行動結果、現場變化、可供玩家反應的危機或線索。",
  "energy_change": 0,
  "insight_change": 0,
  "rapport_change": 0,
  "savings_change": 0,
  "mood": "一句話描述目前局勢，例如：火把將熄，洞穴深處傳來拖行聲"
}
`;

function updateUI() {
    document.getElementById('energy').innerText = playerStatus.energy;
    document.getElementById('insight').innerText = playerStatus.insight;
    document.getElementById('rapport').innerText = playerStatus.rapport;
    document.getElementById('savings').innerText = playerStatus.savings;
    document.getElementById('mood-text').innerText = currentMood || '—';
}

function clearLog() {
    gameLog = [];
    document.getElementById('narrative-log').innerHTML = '';
}

function appendLog(type, text, record = true) {
    const log = document.getElementById('narrative-log');
    const el = document.createElement('div');
    el.className = `log-entry log-entry--${type}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;

    if (record) {
        gameLog.push({
            type,
            text,
            createdAt: new Date().toISOString(),
        });
    }
}

function restoreLog(entries) {
    gameLog = [];
    document.getElementById('narrative-log').innerHTML = '';
    for (const entry of entries || []) {
        if (!entry?.type || typeof entry.text !== 'string') continue;
        appendLog(entry.type, entry.text, false);
        gameLog.push({
            type: entry.type,
            text: entry.text,
            createdAt: entry.createdAt || new Date().toISOString(),
        });
    }
}

function removeLastSystemLog(text) {
    const log = document.getElementById('narrative-log');
    const loading = log.querySelector('.log-entry--system:last-child');
    if (loading?.textContent === text) loading.remove();

    const last = gameLog.at(-1);
    if (last?.type === 'system' && last.text === text) {
        gameLog.pop();
    }
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
