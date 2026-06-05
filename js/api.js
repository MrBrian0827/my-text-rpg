// 負責與 Google Gemini 進行後端數據通訊的模組 (徹底解除瀏覽器 CORS 封鎖)
async function callGeminiAPI(apiKey, contents, systemInstruction) {
    // 改用最基礎、無相容問題的 v1beta 終端網址
    const url = `https://googleapis.com{apiKey}`;
    
    // 移除會引發 Failed to fetch 的所有自訂 Header，回歸最純粹的傳輸格式
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: contents,
            // 將系統指令包入請求本體中，不再使用進階 Header，防止跨網域錯誤
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { 
                responseMimeType: "application/json" // 確保回傳純 JSON 格式
            }
        })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP 錯誤: ${response.status}`);
    }

    const data = await response.json();
    
    // 防禦性檢查：確保回傳的資料結構完整，若正常則提取純文字 JSON 字串
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error("AI 回傳的資料結構不完整，請重試。");
    }
}
