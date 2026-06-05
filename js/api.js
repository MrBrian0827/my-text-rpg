// 負責與 Google Gemini 進行後端數據通訊的模組 (含 CORS 認證標頭)
async function callGeminiAPI(apiKey, contents, systemInstruction) {
    const url = `https://googleapis.com{apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
            'x-goog-api-client': 'genai-js/1.0.0'
        },
        body: JSON.stringify({
            contents: contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { 
                responseMimeType: "application/json" // 確保回傳純 JSON
            }
        })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP 錯誤代碼: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates.content.parts.text;
}
