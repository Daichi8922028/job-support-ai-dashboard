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

let ai: GoogleGenAI | null = null;

if (typeof window !== 'undefined') {
  if (!apiKeyFromEnv) {
    console.warn(
      "Gemini API key (VITE_GEMINI_API_KEY) is not set or is empty. " +
      "Please ensure the VITE_GEMINI_API_KEY environment variable is correctly configured in your .env.local file."
    );
  } else {
    ai = new GoogleGenAI(apiKeyFromEnv);
    if (apiKeyFromEnv.startsWith("AIzaSy") === false) {
      console.warn(
        "The configured Gemini API key (VITE_GEMINI_API_KEY) appears to be a placeholder or might be invalid. " +
        "Please verify that you have set your actual API key in the .env.local file."
      );
    }
  }
}

export const isApiKeyConfigured = (): boolean => {
  return !!apiKeyFromEnv && ai !== null;
};

// --- Service Response Interface ---
export interface GeminiServiceResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
  error?: string;
}

// --- API Call Functions ---

export const generateChatResponse = async (history: Content[], newMessage: string): Promise<GeminiServiceResponse> => {
  if (!isApiKeyConfigured() || !ai) {
    return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
  }
  try {
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
    if (!isApiKeyConfigured() || !ai) {
        return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
    }
    try {
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
    if (!isApiKeyConfigured() || !ai) {
        return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
    }
    try {
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
    if (!isApiKeyConfigured() || !ai) {
        yield { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
        return;
    }
    try {
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
