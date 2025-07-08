
import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Select from '../components/Select';
import ChatMessage from '../components/ChatMessage';
import { ChatMessage as ChatMessageType } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEFAULT_INDUSTRIES } from '../constants';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const IndustryAnalysisScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [userInput, setUserInput] = useState('');
  const [industry, setIndustry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartAnalysis = () => {
    if (!industry) {
      alert("業界を選択してください。");
      return;
    }
    setAnalysisStarted(true);
    setMessages([
      {
        id: 'ai-init-industry',
        text: `「${industry}」業界の分析を開始します。この業界のどのような点について知りたいですか？例えば、市場規模、成長性、主要プレイヤー、最新トレンド、課題など、質問してください。`,
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const newUserMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      text: userInput,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const mockResponse = `「${industry}」業界の${userInput}についてですね。模擬的な情報ですが、${industry}業界は現在、${userInput.includes('トレンド') ? 'DX化とサステナビリティへの対応' : userInput.includes('課題') ? '人材不足と技術革新の速さ' : '〇〇といった動向'}が注目されています。より詳細な情報は、専門の調査レポートなどを参照すると良いでしょう。`;
      const aiMessage: ChatMessageType = {
        id: `ai-${Date.now()}`,
        text: mockResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500 + Math.random() * 1000);
  };

  if (!analysisStarted) {
    return (
      <Card title="業界分析AIチャット" className="max-w-xl mx-auto">
        <p className="text-sm text-gray-600 mb-4">分析したい業界を選択してください。</p>
        <div className="space-y-4">
          <Select
            label="業界"
            value={industry}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setIndustry(e.target.value)}
            options={DEFAULT_INDUSTRIES.map(ind => ({ value: ind, label: ind }))}
            placeholder="業界を選択" // This prop is now valid
          />
          <Button onClick={handleStartAnalysis} variant="primary" className="w-full">
            分析を開始
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`業界分析: ${industry}`} className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      <Button onClick={() => setAnalysisStarted(false)} size="sm" variant="secondary" className="mb-3 self-start">
         別の業界を分析
      </Button>
      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px]">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" text="AIが分析中..." />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t pt-4">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={`「${industry}」業界について質問を入力...`}
          className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
        />
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={!userInput.trim()} className="h-full px-5">
          <PaperAirplaneIcon className="w-5 h-5"/> {/* Replaced hero-icon */}
          <span className="sr-only">送信</span>
        </Button>
      </form>
    </Card>
  );
};

export default IndustryAnalysisScreen;
