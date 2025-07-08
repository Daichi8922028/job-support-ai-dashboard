import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage as ChatMessageType } from '../types';
import IndustryList, { Industry } from '../components/industry-analysis/IndustryList';
import ChatArea from '../components/industry-analysis/ChatArea';
import AddNewIndustryModal from '../components/industry-analysis/AddNewIndustryModal';
import { generateChatResponse } from '../services/geminiService';
import { Content } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, getDocs, doc, setDoc, addDoc, serverTimestamp, query, orderBy, onSnapshot } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';

// 業界ごとのチャット履歴を管理するデータ構造
type IndustryChatHistory = {
  [industryId: string]: ChatMessageType[];
};

const IndustryAnalysisScreen: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();

  // --- State Management ---
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<IndustryChatHistory>({});
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIndustriesLoading, setIsIndustriesLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedIndustry = industries.find(c => c.id === selectedIndustryId);
  const currentMessages = selectedIndustryId ? chatHistory[selectedIndustryId] || [] : [];

  // --- Firestore Data Fetching ---

  // Fetch industries for the current user
  useEffect(() => {
    if (!userId) return;
    setIsIndustriesLoading(true);
    const industriesCol = collection(db, 'users', userId, 'industries');
    const unsubscribe = onSnapshot(industriesCol, (snapshot) => {
      const industriesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Industry));
      setIndustries(industriesList);
      if (industriesList.length > 0 && !selectedIndustryId) {
        setSelectedIndustryId(industriesList[0].id);
      }
      setIsIndustriesLoading(false);
    }, (error) => {
      console.error("Error fetching industries:", error);
      setIsIndustriesLoading(false);
    });

    return () => unsubscribe();
  }, [userId, selectedIndustryId]);

  // Fetch chat history for the selected industry
  useEffect(() => {
    if (!userId || !selectedIndustryId) {
        if(selectedIndustryId && chatHistory[selectedIndustryId]) {
            // Clear history of previous industry to avoid showing stale data
            setChatHistory(prev => ({...prev, [selectedIndustryId]: []}));
        }
        return;
    };

    const messagesCol = collection(db, 'users', userId, 'industries', selectedIndustryId, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() ?? new Date(),
      } as ChatMessageType));

      if (messages.length === 0 && selectedIndustry) {
        // Add initial message if chat is empty
        const initialMessage: ChatMessageType = {
          id: `ai-init-${selectedIndustryId}`,
          text: `「${selectedIndustry.name}」について分析を開始します。何を知りたいですか？`,
          sender: 'ai',
          timestamp: new Date(),
        };
        messages.push(initialMessage);
      }

      setChatHistory(prev => ({ ...prev, [selectedIndustryId]: messages }));
    }, (error) => {
      console.error("Error fetching chat history:", error);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount or when industry changes
  }, [userId, selectedIndustryId, selectedIndustry]);


  // --- Event Handlers ---

  const handleSelectIndustry = (industryId: string) => {
    setSelectedIndustryId(industryId);
  };

  const handleAddIndustry = async (industryName: string) => {
    if (!userId) return;
    const newIndustryRef = doc(collection(db, 'users', userId, 'industries'));
    const newIndustryData = {
      name: industryName,
    };

    try {
      await setDoc(newIndustryRef, newIndustryData);
      // The onSnapshot listener for industries will automatically update the state.
      setSelectedIndustryId(newIndustryRef.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding industry:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, messageText?: string) => {
    if (e) e.preventDefault();
    if (!selectedIndustryId || !userId) return;

    const textToSend = messageText || userInput;
    if (!textToSend.trim()) return;

    const newUserMessage: Omit<ChatMessageType, 'id'> = {
      text: textToSend,
      sender: 'user',
      timestamp: serverTimestamp(),
    };

    const messagesCol = collection(db, 'users', userId, 'industries', selectedIndustryId, 'messages');
    
    setUserInput('');
    setIsLoading(true);

    try {
      // Add user message to Firestore first
      await addDoc(messagesCol, newUserMessage);

      const industry = industries.find(c => c.id === selectedIndustryId);
      if (!industry) throw new Error("対象業界が見つかりません。");

      const historyForAI = currentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      } as Content));

      const systemPrompt = `あなたは優秀な業界分析アシスタントです。ユーザーが指定した業界「${industry.name}」に関する質問に対して、的確かつ分かりやすく回答してください。`;
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

  if (isIndustriesLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner text="業界情報を読み込んでいます..." />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      <IndustryList
        industries={industries}
        selectedIndustryId={selectedIndustryId}
        onSelectIndustry={handleSelectIndustry}
        onAddNewIndustry={() => setIsModalOpen(true)}
      />

      <main className="flex-grow h-full">
        {selectedIndustry ? (
          <ChatArea
            industryName={selectedIndustry.name}
            messages={currentMessages}
            isLoading={isLoading}
            userInput={userInput}
            onUserInput={setUserInput}
            onSendMessage={handleSendMessage}
            onShowSummary={() => {
              if (selectedIndustry) {
                navigate('/industry-summary', {
                  state: {
                    industryName: selectedIndustry.name,
                    chatHistory: currentMessages,
                  },
                });
              }
            }}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600">分析したい業界を追加してください</h2>
              <p className="text-gray-400 mt-2">左下の「＋ 新しい業界を追加」から始めましょう。</p>
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                業界を追加する
              </Button>
            </div>
          </div>
        )}
      </main>

      <AddNewIndustryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddIndustry={handleAddIndustry}
      />
    </div>
  );
};

export default IndustryAnalysisScreen;
