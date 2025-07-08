import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  Part,
  GroundingChunk,
} from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';

// --- API Key Handling ---
const apiKeyFromEnv = import.meta.env.VITE_GEMINI_API_KEY;

// Warn if the key is missing, but do not initialize the client here.
if (typeof window !== 'undefined' && !apiKeyFromEnv) {
  console.warn(
    "Gemini API key (VITE_GEMINI_API_KEY) is not set or is empty. " +
    "The application will not be able to connect to the Gemini API. " +
    "Please ensure the VITE_GEMINI_API_KEY environment variable is correctly configured in your .env.local file and restart the development server."
  );
}

export const isApiKeyConfigured = (): boolean => {
  console.log('[Debug] Checking API Key. Value:', apiKeyFromEnv);
  // キーが存在し、かつプレースホルダーの値でないことを確認
  const configured = !!apiKeyFromEnv && apiKeyFromEnv !== 'YOUR_API_KEY_HERE';
  console.log('[Debug] Is API Key Configured?', configured);
  return configured;
};

// --- Service Response Interface ---
export interface GeminiServiceResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
  error?: string;
}

// --- API Call Functions ---

export const generateChatResponse = async (history: Content[], newMessage: string): Promise<GeminiServiceResponse> => {
  if (!isApiKeyConfigured()) {
    return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
  }
  try {
    // Initialize the client inside the function call.
    const ai = new GoogleGenAI(apiKeyFromEnv);
    const contents = [...history, { role: 'user', parts: [{ text: newMessage }] }];
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: contents,
    });

    const text = response.text ?? '';
    return { text };

  } catch (error: any) {
    console.error("Gemini API (Chat) error:", error);
    let errorMessage = "AIのチャット応答生成中にエラーが発生しました。";
    if (error.message) {
      errorMessage += ` 詳細: ${error.message}`;
    }
    return { text: "", error: errorMessage };
  }
};

export const generateText = async (prompt: string): Promise<GeminiServiceResponse> => {
    if (!isApiKeyConfigured()) {
        return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
    }
    try {
        const ai = new GoogleGenAI(apiKeyFromEnv);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text = response.text ?? '';
        return { text };
    } catch (error: any) {
        console.error("Gemini API error:", error);
        let errorMessage = "AIの応答生成中にエラーが発生しました。";
        if (error.message) {
            errorMessage += ` 詳細: ${error.message}`;
        }
        if (error.toString().includes("API key not valid")) {
            errorMessage = "Gemini APIキーが無効です。設定を確認してください。";
        } else if (error.toString().includes("fetch")) {
            errorMessage = "ネットワークエラーが発生しました。接続を確認してください。";
        }
        return { text: "", error: errorMessage };
    }
};


export const generateTextWithJsonOutput = async (prompt: string): Promise<GeminiServiceResponse> => {
    if (!isApiKeyConfigured()) {
        return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
    }
    try {
        const ai = new GoogleGenAI(apiKeyFromEnv);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
            },
        });
        
        let jsonStr = (response.text ?? '').trim();
        
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        
        return { text: jsonStr };

    } catch (error: any) {
        console.error("Gemini API (JSON) error:", error);
        let errorMessage = "AIのJSON応答生成中にエラーが発生しました。";
        if (error.message) {
            errorMessage += ` 詳細: ${error.message}`;
        }
        return { text: "", error: errorMessage };
    }
};

export async function* generateTextStream(prompt: string): AsyncGenerator<GeminiServiceResponse, void, undefined> {
    if (!isApiKeyConfigured()) {
        yield { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
        return;
    }
    try {
        const ai = new GoogleGenAI(apiKeyFromEnv);
        const stream = await ai.models.generateContentStream({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        for await (const chunk of stream) {
            const text = chunk.text ?? '';
            yield { text };
        }
    } catch (error: any) {
        console.error("Gemini API streaming error:", error);
        yield { text: "", error: "AIのストリーミング応答中にエラーが発生しました。" };
    }
}
