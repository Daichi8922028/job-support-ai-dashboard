import React, { useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import ChatMessage from '../ChatMessage';
import LoadingSpinner from '../LoadingSpinner';
import Button from '../Button';
import { PaperAirplaneIcon, DocumentTextIcon } from '@heroicons/react/24/solid';

const TEMPLATE_QUESTIONS = [
  "この業界の構造・ビジネスモデルを3点で説明して",
  "主要なプレイヤーとその特徴は？",
  "業界全体の成長トレンド・課題をまとめて",
  "今話題になっているトピックや業界ニュースは？",
  "未経験者が業界に入る上で注意すべき点は？",
  "この業界で求められる人材像は？",
  "今後3〜5年で注目される事業分野は？",
];

interface ChatAreaProps {
  industryName: string;
  messages: ChatMessageType[];
  isLoading: boolean;
  userInput: string;
  onUserInput: (value: string) => void;
  onSendMessage: (e?: React.FormEvent, messageText?: string) => void;
  onShowSummary: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  industryName,
  messages,
  isLoading,
  userInput,
  onUserInput,
  onSendMessage,
  onShowSummary,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTemplateQuestionClick = (question: string) => {
    onSendMessage(undefined, question);
  };

  return (
    <div className="flex-grow flex flex-col h-full p-6 bg-white">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">{industryName}</h2>
        <Button onClick={onShowSummary} size="sm" variant="primary" leftIcon={<DocumentTextIcon className="w-4 h-4"/>}>
          リサーチまとめを見る
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border min-h-[200px]">
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
      <div className="border-t pt-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-600 mb-2">質問テンプレート</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_QUESTIONS.map((q) => (
              <Button 
                key={q} 
                variant="outline" 
                size="sm"
                onClick={() => handleTemplateQuestionClick(q)}
                disabled={isLoading}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
        <form onSubmit={onSendMessage} className="flex items-center gap-2">
          <textarea
            value={userInput}
            onChange={(e) => onUserInput(e.target.value)}
            placeholder={`「${industryName}」について質問を入力...`}
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={isLoading}
          />
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!userInput.trim()} className="h-full px-5">
            <PaperAirplaneIcon className="w-5 h-5"/>
            <span className="sr-only">送信</span>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;