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

if (typeof window !== 'undefined') {
  if (!apiKeyFromEnv) {
    console.warn(
      "Gemini API key (VITE_GEMINI_API_KEY) is not set or is empty. " +
      "Please ensure the VITE_GEMINI_API_KEY environment variable is correctly configured in your .env.local file."
    );
  } else if (apiKeyFromEnv.startsWith("AIzaSy") === false) {
    console.warn(
      "The configured Gemini API key (VITE_GEMINI_API_KEY) appears to be a placeholder or might be invalid. " +
      "Please verify that you have set your actual API key in the .env.local file."
    );
  }
}

// Initialize the GoogleGenAI client
const genAI = new GoogleGenAI(apiKeyFromEnv);
const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });


export const isApiKeyConfigured = (): boolean => {
  return !!apiKeyFromEnv;
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
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(newMessage);
    const response = result.response;
    const text = response.text();
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
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
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
        const generationConfig = {
            responseMimeType: "application/json",
        };
        const result = await model.generateContent({ 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
        });
        const response = result.response;
        let jsonStr = response.text().trim();
        
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
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            yield { text };
        }
    } catch (error: any) {
        console.error("Gemini API streaming error:", error);
        yield { text: "", error: "AIのストリーミング応答中にエラーが発生しました。" };
    }
}
