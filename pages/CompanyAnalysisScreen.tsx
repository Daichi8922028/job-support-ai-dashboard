import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage as ChatMessageType } from '../types';
import CompanyList, { Company } from '../components/company-analysis/CompanyList';
import ChatArea from '../components/company-analysis/ChatArea';
import AddNewCompanyModal from '../components/company-analysis/AddNewCompanyModal';
import { generateChatResponse } from '../services/geminiService';
import { Content } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, getDocs, doc, setDoc, addDoc, serverTimestamp, query, orderBy, onSnapshot } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';

// 企業ごとのチャット履歴を管理するデータ構造
type CompanyChatHistory = {
  [companyId: string]: ChatMessageType[];
};

const CompanyAnalysisScreen: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();

  // --- State Management ---
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<CompanyChatHistory>({});
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const currentMessages = selectedCompanyId ? chatHistory[selectedCompanyId] || [] : [];

  // --- Firestore Data Fetching ---

  // Fetch companies for the current user
  useEffect(() => {
    if (!userId) return;
    setIsCompaniesLoading(true);
    const companiesCol = collection(db, 'users', userId, 'companies');
    const unsubscribe = onSnapshot(companiesCol, (snapshot) => {
      const companiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(companiesList);
      if (companiesList.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(companiesList[0].id);
      }
      setIsCompaniesLoading(false);
    }, (error) => {
      console.error("Error fetching companies:", error);
      setIsCompaniesLoading(false);
    });

    return () => unsubscribe();
  }, [userId, selectedCompanyId]);

  // Fetch chat history for the selected company
  useEffect(() => {
    if (!userId || !selectedCompanyId) {
        if(selectedCompanyId && chatHistory[selectedCompanyId]) {
            // Clear history of previous company to avoid showing stale data
            setChatHistory(prev => ({...prev, [selectedCompanyId]: []}));
        }
        return;
    };

    const messagesCol = collection(db, 'users', userId, 'companies', selectedCompanyId, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() ?? new Date(),
      } as ChatMessageType));

      if (messages.length === 0 && selectedCompany) {
        // Add initial message if chat is empty
        const initialMessage: ChatMessageType = {
          id: `ai-init-${selectedCompanyId}`,
          text: `「${selectedCompany.name}」について分析を開始します。何を知りたいですか？`,
          sender: 'ai',
          timestamp: new Date(),
        };
        messages.push(initialMessage);
      }

      setChatHistory(prev => ({ ...prev, [selectedCompanyId]: messages }));
    }, (error) => {
      console.error("Error fetching chat history:", error);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount or when company changes
  }, [userId, selectedCompanyId, selectedCompany]);


  // --- Event Handlers ---

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleAddCompany = async (companyName: string, industry: string) => {
    if (!userId) return;
    const newCompanyRef = doc(collection(db, 'users', userId, 'companies'));
    const newCompanyData = {
      name: companyName,
      industry: industry,
    };

    try {
      await setDoc(newCompanyRef, newCompanyData);
      // The onSnapshot listener for companies will automatically update the state.
      setSelectedCompanyId(newCompanyRef.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding company:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, messageText?: string) => {
    if (e) e.preventDefault();
    if (!selectedCompanyId || !userId) return;

    const textToSend = messageText || userInput;
    if (!textToSend.trim()) return;

    const newUserMessage: Omit<ChatMessageType, 'id'> = {
      text: textToSend,
      sender: 'user',
      timestamp: serverTimestamp(),
    };

    const messagesCol = collection(db, 'users', userId, 'companies', selectedCompanyId, 'messages');
    
    setUserInput('');
    setIsLoading(true);

    try {
      // Add user message to Firestore first
      await addDoc(messagesCol, newUserMessage);

      const company = companies.find(c => c.id === selectedCompanyId);
      if (!company) throw new Error("対象企業が見つかりません。");

      const historyForAI = currentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      } as Content));

      const systemPrompt = `あなたは優秀な企業分析アシスタントです。ユーザーが指定した企業「${company.name}（${company.industry}業界）」に関する質問に対して、的確かつ分かりやすく回答してください。`;
      const fullHistory: Content[] = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "承知いたしました。" }] },
        ...historyForAI,
      ];

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const response = await generateChatResponse(fullHistory, textToSend, apiKey);

      const aiMessage: Omit<ChatMessageType, 'id'> = {
        text: response.text || response.error || "申し訳ありません、応答を取得できませんでした。",
        sender: 'ai',
        timestamp: serverTimestamp(),
        isError: !!response.error,
      };

      // Add AI message to Firestore
      await addDoc(messagesCol, aiMessage);

    } catch (error: any) {
      console.error("Message sending error:", error);
      const errorMessage: Omit<ChatMessageType, 'id'> = {
        text: `エラーが発生しました: ${error.message}`,
        sender: 'ai',
        timestamp: serverTimestamp(),
        isError: true,
      };
      await addDoc(messagesCol, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Method ---

  if (isCompaniesLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner text="企業情報を読み込んでいます..." />
      </div>
    );
  }

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
            onShowSummary={() => {
              if (selectedCompany) {
                navigate('/company-summary', {
                  state: {
                    companyName: selectedCompany.name,
                    chatHistory: currentMessages,
                  },
                });
              }
            }}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600">分析したい企業を追加してください</h2>
              <p className="text-gray-400 mt-2">左下の「＋ 新しい企業を追加」から始めましょう。</p>
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                企業を追加する
              </Button>
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
