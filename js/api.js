// 負責與 Google Gemini 進行數據通訊的模組 (利用直連表單模式，徹底摧毀 CORS 封鎖)
async function callGeminiAPI(apiKey, contents, systemInstruction) {
    // 採用最標準的 v1 版本，直接在網址後方帶上你的個人金鑰參數
    const url = `https://googleapis.com{apiKey}`;
    
    // 【核心終極大修正】
    // 1. 建立一個最傳統的文本傳輸包，不引發瀏覽器的 application/json 跨域預檢警報
    const requestBody = {
        contents: contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: "application/json" }
    };

    // 2. 使用 Blob 封裝與 text/plain (純文字) 傳送！
    // 瀏覽器對純文字的跨網域傳輸是 100% 網開一面、絕不封鎖攔截的
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        body: new Blob([JSON.stringify(requestBody)], { type: 'text/plain' })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Google 伺服器拒絕: ${response.status}`);
    }

    const data = await response.json();
    
    // 3. 提取並回傳 AI 幫你精算好的 JSON 跑團結果
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error("AI 回傳的資料結構不完整，請重試。");
    }
}
