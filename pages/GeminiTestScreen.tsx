
import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateText, generateTextWithJsonOutput, GeminiServiceResponse } from '../services/geminiService';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from '../components/ChatMessage'; // Re-use ChatMessage component for display
import { SparklesIcon, CodeBracketIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';


const GeminiTestScreen: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('日本の現在の総理大臣は誰ですか？');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);
  const [requestJson, setRequestJson] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'ai', metadata?: Record<string, any>) => {
    setMessages(prev => [...prev, {
      id: `${sender}-${Date.now()}`,
      text,
      sender,
      timestamp: new Date(),
      metadata
    }]);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    addMessage(prompt, 'user');
    setIsLoading(true);
    
    let response: GeminiServiceResponse;

    if (requestJson) {
      // Add instructions to prompt for JSON structure if not already present
      const jsonPrompt = prompt.includes("JSON") ? prompt : 
        `以下の質問に対して、結果をJSON形式で返してください。キーには "answer" と "confidenceScore" (0-1の数値) を含めてください。\n質問: ${prompt}`;
      // Do not add another user message for the modified prompt, let the system handle it silently or show it differently.
      // addMessage(`(JSON形式でリクエスト: ${jsonPrompt})`, 'user', {isSystemNote: true});
      response = await generateTextWithJsonOutput(jsonPrompt);
    } else {
      response = await generateText(prompt, useGoogleSearch);
    }

    setIsLoading(false);

    if (response.error) {
      addMessage(`エラー: ${response.error}`, 'ai', {isError: true});
    } else {
      let responseText = response.text; // Corrected variable declaration
      if (requestJson) {
        try {
          const parsedJson = JSON.parse(response.text);
          responseText = JSON.stringify(parsedJson, null, 2); // Pretty print JSON
        } catch (e) {
          // If parsing fails, show raw text and an error note
          addMessage(`AIからの生テキスト(JSONパース失敗):\n${response.text}`, 'ai'); // Use response.text for raw
          addMessage(`注: JSONとしてのパースに失敗しました。AIが期待通りのJSON形式で応答しなかった可能性があります。`, 'ai', {isSystemNote: true});
          return; 
        }
      }
      addMessage(responseText, 'ai', { groundingChunks: response.groundingChunks }); // Use the processed responseText
    }
  };

  return (
    <Card title="Gemini API 接続テスト (管理者用)" className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      <p className="text-sm text-gray-600 mb-4">
        この画面でGemini APIとの接続をテストし、応答を確認できます。
        APIキー (process.env.API_KEY) が正しく設定されている必要があります。
      </p>

      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200 min-h-[200px]">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" text="Gemini APIに問い合わせ中..." />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="space-y-3 border-t pt-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="プロンプトを入力..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
          rows={3}
          disabled={isLoading}
        />
        <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700">
                <input 
                    type="checkbox" 
                    checked={useGoogleSearch}
                    onChange={(e) => {
                        setUseGoogleSearch(e.target.checked);
                        if (e.target.checked) setRequestJson(false); // Google Search and JSON responseMimeType are incompatible
                    }}
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading} 
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" /> {/* Replaced hero-icon */}
                <span>Google Searchを利用 (最新情報検索)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700">
                <input 
                    type="checkbox" 
                    checked={requestJson}
                    onChange={(e) => {
                        setRequestJson(e.target.checked);
                        if (e.target.checked) setUseGoogleSearch(false); // Google Search and JSON responseMimeType are incompatible
                    }}
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading || useGoogleSearch} // Disable if Google Search is active
                />
                <CodeBracketIcon className="w-5 h-5 text-gray-500" /> {/* Replaced hero-icon */}
                <span>JSON形式で応答をリクエスト</span>
            </label>
        </div>
        {useGoogleSearch && requestJson && ( // This condition should not happen if logic is correct
            <p className="text-xs text-red-500">Google SearchとJSON形式の同時リクエストはサポートされていません。JSON形式リクエストは無効化されます。</p>
        )}
        <Button onClick={handleSubmit} variant="primary" isLoading={isLoading} disabled={!prompt.trim()} className="w-full sm:w-auto" leftIcon={<SparklesIcon className="w-5 h-5"/>}> {/* Replaced hero-icon */}
          送信してAIの応答を取得
        </Button>
      </div>
    </Card>
  );
};

export default GeminiTestScreen;
