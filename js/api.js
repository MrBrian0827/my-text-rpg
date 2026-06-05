// 負責與 Google Gemini 進行後端數據通訊的模組
async function callGeminiAPI(apiKey, contents, systemInstruction) {
    // 使用目前最穩定的生產環境正式 v1 版本
    const url = `https://googleapis.com{apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { 
                responseMimeType: "application/json" // 逼迫 Gemini 必須回傳純 JSON 資料格式
            }
        })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP 錯誤代碼: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text; // 精準對接最新 Google 官方 JSON 資料層級結構
}
