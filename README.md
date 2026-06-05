# 夜旅筆記

私人連載筆記工具。以 Gemini API 共同續寫原創故事，**僅供作者本人使用**。

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

repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `ACCESS_CODE` | 你的私人密碼（自訂，記得住即可） |

### 2. 啟用 GitHub Pages（Actions 部署）

1. **Settings → Pages → Build and deployment**
2. **Source** 選 **GitHub Actions**（不是 Deploy from branch）
3. push 到 `main` 分支，Actions 會自動部署

### 3. 各裝置加入書籤

開啟 `https://你的帳號.github.io/倉庫名/` → 輸入存取碼 → 勾「記住此裝置」→ 加書籤。

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
