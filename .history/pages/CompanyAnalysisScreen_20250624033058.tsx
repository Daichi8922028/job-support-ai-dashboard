
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import CompanyList, { Company } from '../components/company-analysis/CompanyList';
import ChatArea from '../components/company-analysis/ChatArea';
import AddNewCompanyModal from '../components/company-analysis/AddNewCompanyModal';
import { generateChatResponse } from '../services/geminiService';
import { Content } from '@google/genai';

// 企業ごとのチャット履歴を管理するデータ構造
type CompanyChatHistory = {
  [companyId: string]: ChatMessageType[];
};

const CompanyAnalysisScreen: React.FC = () => {
  // --- State Management ---
  const [companies, setCompanies] = useState<Company[]>([
    // 初期データ（テスト用）
    { id: '1', name: '株式会社サンプル', industry: 'IT' },
    { id: '2', name: '株式会社テック', industry: 'ソフトウェア' },
  ]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>('1');
  const [chatHistory, setChatHistory] = useState<CompanyChatHistory>({
    '1': [
      {
        id: 'ai-init-1',
        text: '「株式会社サンプル」について分析を開始します。何を知りたいですか？',
        sender: 'ai',
        timestamp: new Date(),
      },
    ],
    '2': [],
  });
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const currentMessages = selectedCompanyId ? chatHistory[selectedCompanyId] || [] : [];

  // --- Event Handlers ---

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (!chatHistory[companyId] || chatHistory[companyId].length === 0) {
      // 初回選択時に初期メッセージを生成
      const company = companies.find(c => c.id === companyId);
      if (company) {
        const initialMessage: ChatMessageType = {
          id: `ai-init-${companyId}`,
          text: `「${company.name}」について分析を開始します。何を知りたいですか？`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setChatHistory(prev => ({ ...prev, [companyId]: [initialMessage] }));
      }
    }
  };

  const handleAddCompany = (companyName: string, industry: string) => {
    const newCompany: Company = {
      id: `company-${Date.now()}`,
      name: companyName,
      industry: industry,
    };
    setCompanies(prev => [...prev, newCompany]);
    setChatHistory(prev => ({ ...prev, [newCompany.id]: [] }));
    setSelectedCompanyId(newCompany.id);
    setIsModalOpen(false);
    // 新規追加後、すぐに初期メッセージを表示
    handleSelectCompany(newCompany.id);
  };

  const handleSendMessage = async (e?: React.FormEvent, messageText?: string) => {
    if (e) e.preventDefault();
    if (!selectedCompanyId) return;

    const textToSend = messageText || userInput;
    if (!textToSend.trim()) return;

    const newUserMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    // ユーザーのメッセージを即時反映
    setChatHistory(prev => ({
      ...prev,
      [selectedCompanyId]: [...(prev[selectedCompanyId] || []), newUserMessage],
    }));
    setUserInput('');
    setIsLoading(true);

    try {
      const company = companies.find(c => c.id === selectedCompanyId);
      if (!company) {
        throw new Error("対象企業が見つかりません。");
      }

      // 履歴をGemini APIの形式に変換 (ユーザーの最新メッセージも含む)
      const history: Content[] = (chatHistory[selectedCompanyId] || [])
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
      }));

      // システムプロンプトを追加
      const systemPrompt = `あなたは優秀な企業分析アシスタントです。ユーザーが指定した企業「${company.name}（${company.industry}業界）」に関する質問に対して、的確かつ分かりやすく回答してください。`;
      const fullHistory: Content[] = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: "承知いたしました。" }] },
          ...history.slice(0, -1), // 最後のユーザーメッセージは含めない
      ];

      console.log('[Debug] Sending to Gemini:', {
        history: fullHistory,
        newMessage: textToSend,
      });
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const response = await generateChatResponse(fullHistory, textToSend, apiKey);

      const aiMessage: ChatMessageType = {
        id: `ai-${Date.now()}`,
        text: response.text || response.error || "申し訳ありません、応答を取得できませんでした。",
        sender: 'ai',
        timestamp: new Date(),
      };

      setChatHistory(prev => ({
        ...prev,
        [selectedCompanyId]: [...(prev[selectedCompanyId] || []), aiMessage],
      }));

    } catch (error: any) {
      console.error("Message sending error:", error);
      // エラーメッセージをチャットに追加
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        text: `エラーが発生しました: ${error.message}`,
        sender: 'ai',
        timestamp: new Date(),
        isError: true, // エラー表示用のフラグ
      };
      setChatHistory(prev => ({
        ...prev,
        [selectedCompanyId]: [...(prev[selectedCompanyId] || []), errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Method ---

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      <CompanyList
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={handleSelectCompany}
        onAddNewCompany={() => setIsModalOpen(true)}
      />

      <main className="flex-grow h-full">
        {selectedCompany ? (
          <ChatArea
            companyName={selectedCompany.name}
            messages={currentMessages}
            isLoading={isLoading}
            userInput={userInput}
            onUserInput={setUserInput}
            onSendMessage={handleSendMessage}
            onShowSummary={() => alert(`「${selectedCompany.name}」のまとめページを表示します。`)}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600">企業を選択してください</h2>
              <p className="text-gray-400 mt-2">左のリストから企業を選択するか、新しく追加してください。</p>
            </div>
          </div>
        )}
      </main>

      <AddNewCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddCompany={handleAddCompany}
      />
    </div>
  );
};

export default CompanyAnalysisScreen;
