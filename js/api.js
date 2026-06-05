// 負責與 Google Gemini 進行數據通訊的模組 (利用 Blob 封裝純文字，突破任何裝置的 CORS 封鎖)
async function callGeminiAPI(apiKey, contents, systemInstruction) {
    // 採用標準 v1 網址，將金鑰直接帶在網址後方
    const url = `https://googleapis.com{apiKey}`;
    
    // 建立標準的 Google API 請求本體
    const requestBody = {
        contents: contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { 
            responseMimeType: "application/json" // 告訴 Gemini 我們需要 JSON 格式的回應
        }
    };

    // 【終極解決核心】
    // 我們使用 Blob 物件將資料包裝成 'text/plain' (純文字) 傳送。
    // 這在瀏覽器安全機制中被判定為「簡單請求 (Simple Request)」，會100%直接繞過跨網域攔截，
    // 不需要安裝任何瀏覽器套件，任何手機或電腦打開都能直接放行連線！
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        body: new Blob([JSON.stringify(requestBody)], { type: 'text/plain' })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Google 伺服器拒絕連線，代碼: ${response.status}`);
    }

    const data = await response.json();
    
    // 提取並回傳 AI 幫你寫的 JSON 跑團結果
    if (data.candidates && data.candidates?.content?.parts?.[0]?.text) {
        return data.candidates.content.parts[0].text;
    } else {
        throw new Error("AI 回傳的資料結構不完整，請重試。");
    }
}
