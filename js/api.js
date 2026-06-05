// Gemini Developer API v1beta（GitHub Pages 純前端直連）
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function toFriendlyError(err) {
    const raw = String(err?.message || err || '未知錯誤');

    if (raw === 'Failed to fetch' || raw === 'Load failed' || /fetch failed/i.test(raw)) {
        return new Error(
            '無法連線至 Google 服務。\n\n' +
            '請檢查：\n' +
            '① 按 Ctrl+Shift+R 強制重新整理此頁；\n' +
            '② 暫時關閉 uBlock / AdGuard 等外掛（會封鎖 googleapis.com）；\n' +
            '③ 確認網路可存取 Google（部分地區需 VPN）。'
        );
    }

    return err instanceof Error ? err : new Error(raw);
}

async function callGeminiAPI(apiKey, contents, systemInstruction) {
    if (!apiKey) {
        throw new Error('API 金鑰為空，請重新整理頁面並重新輸入金鑰。');
    }

    const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const requestBody = {
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: 'application/json' },
    };

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
    } catch (err) {
        throw toFriendlyError(err);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error?.message || `Google 伺服器拒絕連線，代碼: ${response.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('AI 回傳的資料結構不完整，請重試。');
    }
    return text;
}
