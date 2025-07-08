
import { GoogleGenAI, GenerateContentResponse, Part, Content } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';
import { GroundingChunk } from '../types'; // Import custom type for grounding chunks

// --- API Key Handling ---
// The API key MUST be obtained exclusively from process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible in the execution context.
//
// For client-side applications (like this React app), `process.env.API_KEY` needs to be
// made available during the build process (e.g., by Vite, Create React App, Webpack DefinePlugin).
// For example, if using Vite, you'd typically use `import.meta.env.VITE_API_KEY`.
// If using Create React App, `process.env.REACT_APP_API_KEY`.
// The code below uses `process.env.API_KEY` as per the general requirement.
// The developer needs to ensure their build setup correctly populates this.

const apiKeyFromEnv = import.meta.env.VITE_GEMINI_API_KEY;

if (typeof window !== 'undefined') { // Only show warnings in the browser environment
  if (!apiKeyFromEnv) {
    console.warn(
      "Gemini API key (VITE_GEMINI_API_KEY) is not set or is empty. " +
      "The application will not be able to connect to the Gemini API. " +
      "Please ensure the VITE_GEMINI_API_KEY environment variable is correctly configured in your .env.local file."
    );
  } else if (apiKeyFromEnv.startsWith("AIzaSy") === false) {
    // A basic check for placeholder or obviously incorrect format (Gemini keys usually start with 'AIzaSy')
    // This is a heuristic and might not catch all invalid keys, but helps for common mistakes.
    console.warn(
      "The configured Gemini API key (VITE_GEMINI_API_KEY) appears to be a placeholder or might be invalid. " +
      "Please verify that you have set your actual API key in the .env.local file."
    );
  }
}

// Initialize the GoogleGenAI client directly with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: apiKeyFromEnv });

/**
 * Checks if the Gemini API key seems to be configured.
 * A configured API key should be a non-empty string.
 * @returns {boolean} True if process.env.API_KEY is a non-empty string, false otherwise.
 */
export const isApiKeyConfigured = (): boolean => {
  return !!apiKeyFromEnv; // True if VITE_GEMINI_API_KEY is a non-empty string.
};

// --- Service Response Interface ---
export interface GeminiServiceResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
  error?: string;
}

// --- API Call Functions ---

export const generateChatResponse = async (history: Content[]): Promise<GeminiServiceResponse> => {
  if (!isApiKeyConfigured()) {
    return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
  }
  try {
    const model = ai.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage("続きをどうぞ"); // 新しいメッセージを送信

    const response = result.response;
    const text = response.text() ?? '';
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

export const generateText = async (prompt: string, useGoogleSearch: boolean = false): Promise<GeminiServiceResponse> => {
  if (!isApiKeyConfigured()) {
    return { text: "", error: "APIキーが設定されていません。Gemini APIは利用できません。" };
  }
  try {
    const modelConfig: any = {
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    };

    if (useGoogleSearch) {
      modelConfig.config = {
        tools: [{ googleSearch: {} }],
      };
    } else {
        modelConfig.config = {
          // Default thinking config (enabled)
        }
    }

    const response: GenerateContentResponse = await ai.models.generateContent(modelConfig);
    
    const text = response.text ?? '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    return { text, groundingChunks };

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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
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
    const stream = await ai.models.generateContentStream({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    for await (const chunk of stream) {
      const text = chunk.text ?? '';
      const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
      const groundingChunks = groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      yield { text, groundingChunks };
    }
  } catch (error: any) {
    console.error("Gemini API streaming error:", error);
    yield { text: "", error: "AIのストリーミング応答中にエラーが発生しました。" };
  }
}
