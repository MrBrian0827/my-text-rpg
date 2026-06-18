// Gemini Developer API v1beta（GitHub Pages 純前端直連）
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

class GameApiError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'GameApiError';
        this.statusCode = options.statusCode || 0;
        this.apiStatus = options.apiStatus || '';
        this.retryAfterSeconds = options.retryAfterSeconds || 0;
        this.rawMessage = options.rawMessage || message;
    }
}

function getNextPacificMidnight() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const get = (type) => Number(parts.find((part) => part.type === type)?.value);
    const pacificDate = new Date(Date.UTC(get('year'), get('month') - 1, get('day') + 1, 8, 0, 0));

    while (new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(pacificDate) !== '00:00') {
        pacificDate.setUTCHours(pacificDate.getUTCHours() - 1);
    }

    return pacificDate;
}

function formatDuration(ms) {
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    if (minutes < 60) return `約 ${minutes} 分鐘後`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `約 ${hours} 小時 ${rest} 分鐘後` : `約 ${hours} 小時後`;
}

function formatLocalTime(date) {
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getRetryAfterSeconds(response) {
    const value = response.headers.get('Retry-After');
    if (!value) return 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function buildQuotaMessage(retryAfterSeconds) {
    const nextDailyReset = getNextPacificMidnight();
    const dailyWait = formatDuration(nextDailyReset.getTime() - Date.now());
    const retryHint = retryAfterSeconds
        ? `Google 建議 ${formatDuration(retryAfterSeconds * 1000)} 再試。`
        : '如果只是每分鐘限制，通常等 1 到 2 分鐘再試即可。';

    return (
        'Gemini API 額度暫時用完或請求太頻繁。\n\n' +
        `${retryHint}\n` +
        `如果是每日免費額度用完，通常會在太平洋時間午夜重置；你的本機時間大約是 ${formatLocalTime(nextDailyReset)}（${dailyWait}）。\n\n` +
        '為了避免產生費用，請不要為這個專案啟用付費帳單；等免費額度重置後再玩。'
    );
}

function toFriendlyError(err) {
    const raw = String(err?.message || err || '未知錯誤');

    if (raw === 'Failed to fetch' || raw === 'Load failed' || /fetch failed/i.test(raw)) {
        return new GameApiError(
            '無法連線至 Google 服務。\n\n' +
            '請檢查：\n' +
            '① 按 Ctrl+Shift+R 強制重新整理此頁；\n' +
            '② 暫時關閉 uBlock / AdGuard 等外掛（會封鎖 googleapis.com）；\n' +
            '③ 確認網路可存取 Google（部分地區需 VPN）。'
        );
    }

    return err instanceof Error ? err : new Error(raw);
}

function toFriendlyApiError(response, data, retryAfterSeconds) {
    const statusCode = response.status;
    const apiStatus = data.error?.status || '';
    const rawMessage = data.error?.message || `Google 伺服器拒絕連線，代碼: ${statusCode}`;
    const normalized = `${apiStatus} ${rawMessage}`.toUpperCase();

    if (statusCode === 400 && normalized.includes('FAILED_PRECONDITION')) {
        return new GameApiError(
            '目前這把 API key 所在的地區或專案無法使用 Gemini 免費層。\n\n' +
            '因為你希望遊戲一定免費，請不要啟用付費帳單。建議改用支援免費層的 Google 帳號或專案重新建立 API key。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    if (statusCode === 400) {
        return new GameApiError(
            '送給 Gemini 的請求格式不被接受。\n\n' +
            '可能原因：遊戲紀錄太長、模型參數不支援，或這次回合內容讓請求變得過大。請下載存檔後把這段錯誤回報給我，我可以幫你調整。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    if (statusCode === 401 || statusCode === 403) {
        return new GameApiError(
            'API 金鑰無效、權限不足，或限制設定不允許目前網站使用。\n\n' +
            '請確認 API key 沒有貼錯、沒有被刪除，且允許呼叫 Gemini API。若你有設定網站來源限制，請把目前的 GitHub Pages 網址加入允許清單。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    if (statusCode === 404) {
        return new GameApiError(
            `找不到目前設定的模型：${GEMINI_MODEL}。\n\n` +
            '可能是模型名稱變更、所在地區不支援，或 API 版本不支援。請把這段錯誤回報給我，我會幫你更新模型設定。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    if (statusCode === 429 || normalized.includes('RESOURCE_EXHAUSTED')) {
        return new GameApiError(buildQuotaMessage(retryAfterSeconds), {
            statusCode,
            apiStatus,
            retryAfterSeconds,
            rawMessage,
        });
    }

    if (statusCode === 500) {
        return new GameApiError(
            'Google 服務端發生暫時錯誤，或目前遊戲上下文太長。\n\n' +
            '請先下載存檔，等幾分鐘後再試。如果一直發生，請把存檔與這段錯誤回報給我。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    if (statusCode === 503) {
        return new GameApiError(
            'Gemini 服務目前過載或暫時無法使用。\n\n' +
            '請約 5 到 10 分鐘後再試；你的存檔不會受到影響。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    if (statusCode === 504) {
        return new GameApiError(
            'Gemini 這次處理逾時。\n\n' +
            '通常是目前遊戲紀錄太長或服務回應太慢。請先下載存檔，稍後再試；如果重複發生，我可以幫你加入壓縮舊紀錄功能。',
            { statusCode, apiStatus, rawMessage }
        );
    }

    return new GameApiError(
        `Gemini 回傳未分類錯誤（${statusCode}）。\n\n${rawMessage}`,
        { statusCode, apiStatus, rawMessage }
    );
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
        throw toFriendlyApiError(response, data, getRetryAfterSeconds(response));
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        const finishReason = data.candidates?.[0]?.finishReason;
        const blockReason = data.promptFeedback?.blockReason;
        if (blockReason || finishReason === 'SAFETY') {
            throw new GameApiError(
                '這次內容被 Gemini 安全機制擋下，沒有產生故事。\n\n' +
                '請換一種比較不露骨、不涉及極端傷害或敏感內容的行動描述再試。'
            );
        }
        throw new GameApiError('AI 回傳的資料結構不完整，請重試。');
    }
    return text;
}

async function callGeminiAPIWithRetry(apiKey, contents, systemInstruction, maxRetry = 3) {
    let lastError;

    for (let i = 0; i < maxRetry; i++) {
        try {
            return await callGeminiAPI(apiKey, contents, systemInstruction);
        } catch (err) {
            lastError = err;

            // 👉 只針對 503 / 500 / 504 retry
            const status = err?.statusCode;

            const shouldRetry =
                status === 503 ||
                status === 500 ||
                status === 504;

            if (!shouldRetry) {
                throw err; // ❌ 其他錯誤直接丟
            }

            // 👉 指數退避（越來越久）
            const waitTime = 1500 * Math.pow(2, i);

            console.warn(`Retry ${i + 1}/${maxRetry} after ${waitTime}ms`);

            await new Promise(r => setTimeout(r, waitTime));
        }
    }

    throw lastError;
}