// 全局遊戲狀態記憶
let chatHistory = [];
let playerStatus = { hp: 0, atk: 0, def: 0, gold: 0 };

// 核心 TRPG 大腦指令：定義 AI 行為，限制其只能輸出網頁看得懂的 JSON 封包
const GAME_SYSTEM_INSTRUCTION = `
你是一個擁有極高自由度且數值計算嚴謹的 TRPG 遊戲主機（GM）。請根據玩家的世界觀與職業展開繁體中文故事。

【核心職責】
1. 開場分配：當遊戲為第一回合時，你必須根據玩家輸入的「世界觀」與「職業描述」，為他分配合理的初始 HP、攻擊力(atk)、防禦力(def)和初始金幣(gold)。(數值總合請保持基礎平衡，直接填入 JSON 的對應變動值欄位中)。
2. 數值碰撞：後續的戰鬥與遭遇事件，必須嚴格根據玩家當前的實際數值進行合理的物理或魔法傷害計算，並給予對應戰利品。
3. 輸出限制：你每次的回應，必須「只能」且「完全」符合以下 JSON 格式，絕對不要夾帶任何額外的 Markdown 標籤或解釋性文字：
{
  "story": "生動的場景描述，字數約 100-200 字。如果是第一回合，請在故事開頭說明你基於他的職業背景，給予了怎樣的初始能力值分配。若發生戰鬥要明確寫出傷害與血量扣除的計算過程。",
  "hp_change": 0,
  "atk_change": 0,
  "def_change": 0,
  "gold_change": 0,
  "options": [
    "符合該時代背景與現狀的行動選項一",
    "符合該時代背景與現狀的行動選項二",
    "符合該時代背景與現狀的行動選項三"
  ]
}
`;

// 刷新前端畫面上能力值數字的函式
function updateUI() {
    document.getElementById('hp').innerText = playerStatus.hp;
    document.getElementById('atk').innerText = playerStatus.atk;
    document.getElementById('def').innerText = playerStatus.def;
    document.getElementById('gold').innerText = playerStatus.gold;
}

// 顯示讀取中動態效果
function renderLoading() {
    document.getElementById('story-text').innerHTML = `<div class="loading">⏳ 命運之輪轉動中，AI 正在精算結果與生成隨機事件...</div>`;
    document.getElementById('options-container').innerHTML = '';
}
