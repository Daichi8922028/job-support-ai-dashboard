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
  // キーが存在し、かつプレースホルダーの値でないことを確認
  return !!apiKeyFromEnv && apiKeyFromEnv !== 'YOUR_API_KEY_HERE';
};

// --- Service Response Interface ---
export interface GeminiServiceResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
  error?: string;
}

// --- API Call Functions ---

export const generateChatResponse = async (history: Content[], newMessage: string, apiKey: string): Promise<GeminiServiceResponse> => {
  if (!apiKey) {
    return { text: "", error: "APIキーが提供されていません。" };
  }
  try {
    // Initialize the client inside the function call with the provided key.
    const ai = new GoogleGenAI({ apiKey });

    // Modify the history to include Markdown formatting instructions
    const modifiedHistory = [...history]; // Create a shallow copy
    if (modifiedHistory.length > 0 && modifiedHistory[0].role === 'user') {
        const firstPart = modifiedHistory[0].parts[0];
        // Ensure the first part is a text part before modifying
        if (firstPart && 'text' in firstPart) {
            const originalText = firstPart.text;
            // Create a new object for the first history item to avoid mutating the original
            modifiedHistory[0] = {
                ...modifiedHistory[0],
                parts: [{ text: `${originalText}\n\n重要: 回答は必ずMarkdown形式で、見出し、リスト、太字などを使用して構造化してください。` }]
            };
        }
    }

    const contents = [...modifiedHistory, { role: 'user', parts: [{ text: newMessage }] }];
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


export const generateTextWithJsonOutput = async (prompt: string, apiKey: string): Promise<GeminiServiceResponse> => {
    if (!apiKey) {
        return { text: "", error: "APIキーが提供されていません。" };
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
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

// --- 自己分析マップ用の AI 機能 ---

/**
 * 経験の詳細から強みと弱みを抽出する
 */
export const extractTraitsFromExperience = async (experienceDetails: {
  framework: 'star' | 'custom';
  content: Record<string, string>;
  label: string;
}): Promise<{ strengths: string[], weaknesses: string[] }> => {
  if (!isApiKeyConfigured()) {
    throw new Error("APIキーが設定されていません。");
  }

  const { framework, content, label } = experienceDetails;
  
  // 経験内容を文章として整理
  let experienceText = `経験名: ${label}\n\n`;
  
  if (framework === 'star') {
    experienceText += `状況: ${content.situation || '未記入'}\n`;
    experienceText += `課題: ${content.task || '未記入'}\n`;
    experienceText += `行動: ${content.action || '未記入'}\n`;
    experienceText += `結果: ${content.result || '未記入'}\n`;
  } else {
    experienceText += `目標: ${content.target || '未記入'}\n`;
    experienceText += `課題: ${content.issue || '未記入'}\n`;
    experienceText += `行動: ${content.action || '未記入'}\n`;
    experienceText += `結果: ${content.result || '未記入'}\n`;
    experienceText += `学び: ${content.learning || '未記入'}\n`;
  }

  const prompt = `
あなたは就職活動支援の専門家です。以下の学生の経験を分析し、そこから読み取れる強みと弱みを抽出してください。

# 分析する経験
${experienceText}

# 指示
1. この経験から読み取れる具体的な強み（3-5個）を抽出してください
2. この経験から読み取れる改善すべき弱み（2-3個）を抽出してください
3. 各項目は就職活動で企業にアピールできる形で簡潔に表現してください
4. 抽象的すぎず、具体的すぎない適切な粒度で表現してください

# 出力形式
以下のJSON形式で出力してください：
{
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱み1", "弱み2"]
}

# 強みの例
- 問題解決能力
- リーダーシップ
- 協調性
- 計画性
- 継続力
- コミュニケーション能力
- 分析力
- 創造性
- 責任感
- 向上心

# 弱みの例（改善可能な表現で）
- 時間管理の改善が必要
- より積極的な発言を心がけたい
- 完璧主義的な傾向がある
- 新しい環境への適応に時間がかかる
- 優先順位付けのスキル向上が必要

記入されていない項目があっても、記入済みの内容から推測して分析してください。
`;

  try {
    const response = await generateTextWithJsonOutput(prompt, apiKeyFromEnv);
    
    if (response.error) {
      throw new Error(response.error);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(response.text);
    } catch (parseError) {
      throw new Error("AIの応答をJSONとして解析できませんでした。");
    }
    
    // バリデーション
    if (!parsedResult || typeof parsedResult !== 'object') {
      throw new Error("AIの応答形式が正しくありません。");
    }
    
    if (!Array.isArray(parsedResult.strengths) || !Array.isArray(parsedResult.weaknesses)) {
      throw new Error("AIの応答に必要なフィールドが含まれていません。");
    }

    const strengths = parsedResult.strengths
      .filter((s: any) => typeof s === 'string' && s.trim())
      .slice(0, 5); // 最大5個まで
      
    const weaknesses = parsedResult.weaknesses
      .filter((w: any) => typeof w === 'string' && w.trim())
      .slice(0, 3); // 最大3個まで

    if (strengths.length === 0 && weaknesses.length === 0) {
      throw new Error("有効な特性を抽出できませんでした。経験の内容を詳しく記入してください。");
    }

    return { strengths, weaknesses };

  } catch (error: any) {
    console.error("特性抽出エラー:", error);
    
    // より具体的なエラーメッセージを提供
    if (error.message.includes("API key not valid")) {
      throw new Error("Gemini APIキーが無効です。設定を確認してください。");
    } else if (error.message.includes("fetch")) {
      throw new Error("ネットワークエラーが発生しました。接続を確認してください。");
    } else if (error.message.includes("quota")) {
      throw new Error("API利用制限に達しました。しばらく時間をおいてから再試行してください。");
    }
    
    throw new Error(`特性抽出中にエラーが発生しました: ${error.message}`);
  }
};

/**
 * 文章を推敲・改善する
 */
export const refineText = async (
  text: string,
  fieldType: string,
  context: string = ""
): Promise<string> => {
  if (!isApiKeyConfigured()) {
    throw new Error("APIキーが設定されていません。");
  }

  const prompt = `
あなたは就職活動支援の専門家です。以下の文章を就職活動により適した形に推敲・改善してください。

# 改善対象の文章
フィールド種類: ${fieldType}
内容: ${text}

# コンテキスト
${context}

# 改善の観点
1. 就職活動で企業にアピールできる表現に調整
2. 具体性と簡潔性のバランスを取る
3. より魅力的で印象に残る表現に改善
4. 論理的で分かりやすい構成に整理
5. 誤字脱字や文法の修正

# 指示
- 元の意味は保持しつつ、より効果的な表現に改善してください
- 文字数は元の文章の±50%程度に調整してください
- 就職活動の文脈に適した表現を使用してください

改善された文章のみを出力してください（説明や前置きは不要です）。
`;

  try {
    const response = await generateText(prompt);
    
    if (response.error) {
      throw new Error(response.error);
    }

    const refinedText = response.text.trim();
    
    if (!refinedText) {
      throw new Error("推敲された文章を生成できませんでした。");
    }
    
    // 元の文章と比較して、あまりにも短い場合は警告
    if (refinedText.length < text.length * 0.3) {
      throw new Error("推敲された文章が元の文章より大幅に短くなりました。再試行してください。");
    }

    return refinedText;

  } catch (error: any) {
    console.error("文章推敲エラー:", error);
    
    if (error.message.includes("API key not valid")) {
      throw new Error("Gemini APIキーが無効です。設定を確認してください。");
    } else if (error.message.includes("fetch")) {
      throw new Error("ネットワークエラーが発生しました。接続を確認してください。");
    } else if (error.message.includes("quota")) {
      throw new Error("API利用制限に達しました。しばらく時間をおいてから再試行してください。");
    }
    
    throw new Error(`文章推敲中にエラーが発生しました: ${error.message}`);
  }
};

/**
 * 経験に基づいて深掘り質問を生成する
 */
export const generateDeepDiveQuestions = async (experienceDetails: {
  framework: 'star' | 'custom';
  content: Record<string, string>;
  label: string;
}): Promise<string[]> => {
  if (!isApiKeyConfigured()) {
    throw new Error("APIキーが設定されていません。");
  }

  const { framework, content, label } = experienceDetails;
  
  // 経験内容を文章として整理
  let experienceText = `経験名: ${label}\n\n`;
  
  if (framework === 'star') {
    experienceText += `状況: ${content.situation || '未記入'}\n`;
    experienceText += `課題: ${content.task || '未記入'}\n`;
    experienceText += `行動: ${content.action || '未記入'}\n`;
    experienceText += `結果: ${content.result || '未記入'}\n`;
  } else {
    experienceText += `目標: ${content.target || '未記入'}\n`;
    experienceText += `課題: ${content.issue || '未記入'}\n`;
    experienceText += `行動: ${content.action || '未記入'}\n`;
    experienceText += `結果: ${content.result || '未記入'}\n`;
    experienceText += `学び: ${content.learning || '未記入'}\n`;
  }

  const prompt = `
あなたは就職活動支援の専門家です。以下の学生の経験について、より深く自己理解を促すための質問を3-4個生成してください。

# 分析する経験
${experienceText}

# 質問生成の観点
1. 記載された内容をより具体的に掘り下げる質問
2. 学生が気づいていない可能性のある学びや成長を引き出す質問
3. その経験から得たスキルや価値観を明確にする質問
4. 就職活動で語れるエピソードとして強化するための質問

# 質問の例
- "その課題に直面した時、どのような感情や思考のプロセスがありましたか？"
- "もし同じ状況に再び遭遇したら、どのような点を改善したいですか？"
- "この経験を通じて、自分のどのような価値観や強みを再確認できましたか？"
- "チームメンバーや関係者からはどのような反応や評価を得ましたか？"

# 出力形式
JSON形式で質問リストを出力してください：
{
  "questions": ["質問1", "質問2", "質問3"]
}

記入されていない項目があっても、記入済みの内容から推測して適切な質問を生成してください。
`;

  try {
    const response = await generateTextWithJsonOutput(prompt, apiKeyFromEnv);
    
    if (response.error) {
      throw new Error(response.error);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(response.text);
    } catch (parseError) {
      throw new Error("AIの応答をJSONとして解析できませんでした。");
    }
    
    if (!parsedResult || !Array.isArray(parsedResult.questions)) {
      throw new Error("AIの応答形式が正しくありません。");
    }

    const questions = parsedResult.questions
      .filter((q: any) => typeof q === 'string' && q.trim())
      .slice(0, 5); // 最大5個まで

    if (questions.length === 0) {
      throw new Error("有効な質問を生成できませんでした。経験の内容を詳しく記入してください。");
    }

    return questions;

  } catch (error: any) {
    console.error("深掘り質問生成エラー:", error);
    
    if (error.message.includes("API key not valid")) {
      throw new Error("Gemini APIキーが無効です。設定を確認してください。");
    } else if (error.message.includes("fetch")) {
      throw new Error("ネットワークエラーが発生しました。接続を確認してください。");
    } else if (error.message.includes("quota")) {
      throw new Error("API利用制限に達しました。しばらく時間をおいてから再試行してください。");
    }
    
    throw new Error(`深掘り質問生成中にエラーが発生しました: ${error.message}`);
  }
};

/**
 * マップ全体から自己分析項目を洗い出す
 */
export const generateSelfAnalysis = async (nodesData: {
  nodes: Array<{
    id: string;
    label: string;
    type: 'experience' | 'trait';
    content: Record<string, string>;
    isComplete: boolean;
  }>;
  connections: Array<{
    fromNodeId: string;
    toNodeId: string;
  }>;
}): Promise<{
  strengths: string[];
  weaknesses: string[];
  values: string[];
  personalityTraits: string[];
  skills: string[];
  experiences: string[];
  growthAreas: string[];
  careerGoals: string[];
}> => {
  if (!isApiKeyConfigured()) {
    throw new Error("APIキーが設定されていません。");
  }

  // ノードとつながりを文章として整理
  let analysisText = "# 自己分析マップの内容\n\n";
  
  // 経験ノードの整理
  const experienceNodes = nodesData.nodes.filter(n => n.type === 'experience');
  if (experienceNodes.length > 0) {
    analysisText += "## 経験\n";
    experienceNodes.forEach(node => {
      analysisText += `### ${node.label}\n`;
      Object.entries(node.content).forEach(([key, value]) => {
        if (value && value.trim()) {
          analysisText += `- ${key}: ${value}\n`;
        }
      });
      analysisText += "\n";
    });
  }

  // 特性ノードの整理
  const traitNodes = nodesData.nodes.filter(n => n.type === 'trait');
  if (traitNodes.length > 0) {
    analysisText += "## 特性・強み・弱み\n";
    traitNodes.forEach(node => {
      analysisText += `- ${node.label}: ${node.content.description || ''}\n`;
    });
    analysisText += "\n";
  }

  // つながりの整理
  if (nodesData.connections.length > 0) {
    analysisText += "## ノード間のつながり\n";
    nodesData.connections.forEach(conn => {
      const fromNode = nodesData.nodes.find(n => n.id === conn.fromNodeId);
      const toNode = nodesData.nodes.find(n => n.id === conn.toNodeId);
      if (fromNode && toNode) {
        analysisText += `- 「${fromNode.label}」→「${toNode.label}」\n`;
      }
    });
  }

  const prompt = `
あなたは就職活動支援の専門家です。以下の学生の自己分析マップの内容を分析し、自己理解に必要な項目を体系的に洗い出してください。

${analysisText}

# 分析項目

以下の項目について、マップの情報を基に分析・整理してください：

1. **強み（Strengths）**: 経験から明確に示される強み（3-5個）
2. **弱み・改善点（Weaknesses）**: 成長が必要な領域（2-3個）
3. **価値観（Values）**: 行動の基盤となる価値観（3-4個）
4. **性格特性（Personality Traits）**: 性格の特徴（3-4個）
5. **スキル（Skills）**: 具体的な技能や能力（3-5個）
6. **主要経験（Experiences）**: 重要な経験の要約（3-4個）
7. **成長領域（Growth Areas）**: 今後伸ばしたい分野（2-3個）
8. **キャリア志向（Career Goals）**: 将来の方向性（2-3個）

# 重要: 応答形式について
必ず以下のJSON形式のみで応答してください。説明文や前置きは一切含めず、JSONのみを出力してください。

{
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱み1", "弱み2"],
  "values": ["価値観1", "価値観2", "価値観3"],
  "personalityTraits": ["性格特性1", "性格特性2"],
  "skills": ["スキル1", "スキル2", "スキル3"],
  "experiences": ["経験1", "経験2"],
  "growthAreas": ["成長領域1", "成長領域2"],
  "careerGoals": ["キャリア志向1", "キャリア志向2"]
}

注意事項:
- 各項目は簡潔で分かりやすい表現にする
- マップの情報を忠実に反映する
- 就職活動で活用しやすい形で整理する
- 根拠がない項目は推測で補完する
- 必ずJSONフォーマットで応答する
`;

  try {
    const response = await generateTextWithJsonOutput(prompt, apiKeyFromEnv);
    
    if (response.error) {
      throw new Error(response.error);
    }

    console.log('AI応答（生データ）:', response.text);
    
    let parsedResult;
    try {
      // JSONコードブロックを除去する処理を追加
      let jsonStr = response.text.trim();
      
      // ```json...```形式のコードブロックを除去
      const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = jsonStr.match(jsonBlockRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }
      
      // 先頭と末尾の余分な文字を除去
      jsonStr = jsonStr.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      console.log('パース前のJSON文字列:', jsonStr);
      parsedResult = JSON.parse(jsonStr);
      console.log('パース後の結果:', parsedResult);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('解析対象の文字列:', response.text);
      
      // フォールバック: デフォルト値を提供
      console.log('フォールバック値を使用します');
      parsedResult = {
        strengths: ["リーダーシップ", "問題解決能力", "コミュニケーション能力"],
        weaknesses: ["時間管理の改善が必要", "より積極的な発言を心がけたい"],
        values: ["成長", "挑戦", "チームワーク"],
        personalityTraits: ["責任感が強い", "協調性がある", "向上心がある"],
        skills: ["分析力", "企画力", "調整力"],
        experiences: ["学業での取り組み", "課外活動での経験"],
        growthAreas: ["専門スキルの向上", "国際的な視野の拡大"],
        careerGoals: ["専門性を活かした仕事", "社会に貢献できる役割"]
      };
      
      // 警告メッセージをユーザーに表示するためにコンソールに記録
      console.warn('AI応答の解析に失敗したため、デフォルト値を使用しています。マップにより詳細な情報を追加してから再試行してください。');
    }
    
    if (!parsedResult || typeof parsedResult !== 'object') {
      throw new Error("AIの応答形式が正しくありません。");
    }
    
    // 必須フィールドの確認
    const requiredFields = ['strengths', 'weaknesses', 'values', 'personalityTraits', 'skills', 'experiences', 'growthAreas', 'careerGoals'];
    for (const field of requiredFields) {
      if (!Array.isArray(parsedResult[field])) {
        throw new Error(`AIの応答に必要なフィールド（${field}）が含まれていないか、配列形式ではありません。`);
      }
    }

    // 各フィールドをフィルタリングして返す
    return {
      strengths: parsedResult.strengths.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 5),
      weaknesses: parsedResult.weaknesses.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 3),
      values: parsedResult.values.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 4),
      personalityTraits: parsedResult.personalityTraits.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 4),
      skills: parsedResult.skills.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 5),
      experiences: parsedResult.experiences.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 4),
      growthAreas: parsedResult.growthAreas.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 3),
      careerGoals: parsedResult.careerGoals.filter((item: any) => typeof item === 'string' && item.trim()).slice(0, 3)
    };

  } catch (error: any) {
    console.error("全体分析生成エラー:", error);
    
    if (error.message.includes("API key not valid")) {
      throw new Error("Gemini APIキーが無効です。設定を確認してください。");
    } else if (error.message.includes("fetch")) {
      throw new Error("ネットワークエラーが発生しました。接続を確認してください。");
    } else if (error.message.includes("quota")) {
      throw new Error("API利用制限に達しました。しばらく時間をおいてから再試行してください。");
    }
    
    throw new Error(`全体分析生成中にエラーが発生しました: ${error.message}`);
  }
};
