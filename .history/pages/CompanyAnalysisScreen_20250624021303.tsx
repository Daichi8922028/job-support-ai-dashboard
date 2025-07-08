
import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import ChatMessage from '../components/ChatMessage';
import { ChatMessage as ChatMessageType } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEFAULT_INDUSTRIES } from '../constants';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const CompanyAnalysisScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [userInput, setUserInput] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartAnalysis = () => {
    if (!companyName || !industry) {
      alert("企業名と業界を選択してください。");
      return;
    }
    setAnalysisStarted(true);
    setMessages([
      {
        id: 'ai-init-company',
        text: `了解しました。「${companyName}」（${industry}業界）について分析を開始しますね。どのような情報に興味がありますか？例えば、事業内容、強み・弱み、最近のニュース、競合他社など、具体的に質問してください。`,
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
      const mockResponse = `「${companyName}」の${userInput}についてですね。模擬的な回答ですが、${companyName}は${industry}業界で注目されており、特に${userInput.includes('強み') ? '技術力と市場シェア' : userInput.includes('弱み') ? '新規事業への展開の遅れ' : '〇〇の分野'}で知られています。より詳しい情報は、企業の公式サイトやIR情報を確認することをお勧めします。`;
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
      <Card title="企業分析AIチャット" className="max-w-xl mx-auto">
        <p className="text-sm text-gray-600 mb-4">分析したい企業名と業界を入力・選択してください。</p>
        <div className="space-y-4">
          <Input 
            label="企業名" 
            value={companyName} 
            onChange={(e) => setCompanyName(e.target.value)} 
            placeholder="例: 株式会社サンプル"
          />
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
    <Card title={`企業分析: ${companyName} (${industry})`} className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
       <Button onClick={() => setAnalysisStarted(false)} size="sm" variant="secondary" className="mb-3 self-start">
         別の企業を分析
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
          placeholder={`「${companyName}」について質問を入力...`}
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

export default CompanyAnalysisScreen;
