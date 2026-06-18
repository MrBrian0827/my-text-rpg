# 邊境委託所

私人黑暗奇幻文字 RPG。登入後建立冒險者，接受邊境公會委託，透過 Gemini API 由 AI 擔任主持人，依你的自由文字行動推進任務、判定風險與代價。

---

## 存取碼安全說明（請先讀）

### Actions Secret 能保護什麼？

| 保護項目 | Private repo | Actions Secret | 前端存取碼畫面 |
|---------|:------------:|:--------------:|:--------------:|
| 外人看不到 GitHub 原始碼 | ✅ | — | — |
| 密碼不出現在 git 紀錄 | — | ✅ | — |
| 密碼不寫在 repo 檔案裡 | — | ✅ | — |
| 開啟網頁的人無法得知密碼 | — | — | ❌ |

**重點**：這是純前端網頁，部署後瀏覽器一定會下載 `config.js`。  
因此無論密碼寫在 repo 還是用 Actions Secret 注入，**知道網址的人仍可在瀏覽器開發者工具看到密碼**，或直接略過驗證。

Actions Secret 的價值是：**密碼不會被 commit 到 GitHub**，而不是「網頁訪客看不到」。

### 實際防護策略（個人使用足夠）

1. **倉庫設 Private** → 外人看不到你的程式碼
2. **repo 名稱低調** → 降低網址被猜到的機會
3. **不公開分享網址** → 不貼社群、論壇
4. **存取碼** → 擋住「偶然點進來」的人，不是軍事級加密
5. 已內建 `noindex` → 降低被搜尋引擎收錄

若需要「真正只有你能開」的保護，必須加**伺服器端驗證**（例如 Cloudflare Access），已超出本專案範圍。

---

## 多裝置遊玩設定

### 1. 設定 GitHub Secret

repo → **Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Name | Value |
|------|-------|
| `ACCESS_CODE` | 你的私人密碼（自訂，記得住即可） |

請放在 **Secrets**，不要放在 Variables。Variables 較適合非敏感設定；登入密碼應使用 Secret。

### 2. 啟用 GitHub Pages（Actions 部署）

1. **Settings → Pages → Build and deployment**
2. **Source** 選 **GitHub Actions**（不是 Deploy from branch）
3. push 到 `main` 分支，Actions 會自動部署

### 3. 各裝置加入書籤

開啟 `https://你的帳號.github.io/倉庫名/` → 輸入存取碼 → 建立冒險者 → 加書籤。

---

## 本機測試（選用）

```bash
cp js/config.example.js js/config.js
# 編輯 js/config.js 填入密碼
npx serve .
```

`js/config.js` 已在 `.gitignore`，不會被 commit。

---

## 免責聲明

本專案為**個人非商業**之學習作品，與任何付費產品無關。請勿公開宣傳或收費。

---

## 技術說明

- 純靜態 HTML / CSS / JS
- **API 金鑰**：僅存瀏覽器記憶體，不寫入 localStorage
- **遊戲世界**：原創黑暗奇幻邊境，不使用既有商業作品的專有角色、地名或情節
- 金鑰申請：[Google AI Studio](https://aistudio.google.com/apikey)

```
├── .github/workflows/deploy-pages.yml
├── index.html
├── css/style.css
└── js/
    ├── config.example.js  ← 本機用範本
    ├── config.js          ← 本機用（gitignore）/ 線上由 Actions 產生
    ├── gate.js
    ├── api.js
    ├── system.js
    └── app.js
```
