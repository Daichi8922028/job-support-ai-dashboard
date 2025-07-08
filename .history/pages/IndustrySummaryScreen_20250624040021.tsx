import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { generateTextWithJsonOutput } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChatMessage } from '../types';

interface Summary {
  structure: string[];
  trends: string[];
  main_players: string[];
  strengths_weaknesses: string[];
  personal_thoughts: string;
}

const IndustrySummaryScreen: React.FC = () => {
  const location = useLocation();
  const { industryName, chatHistory } = location.state || { industryName: '不明な業界', chatHistory: [] };

  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateSummary = async () => {
      if (!chatHistory || chatHistory.length === 0) {
        setError("要約対象のチャット履歴がありません。");
        setIsLoading(false);
        return;
      }

      const historyText = chatHistory.map((msg: ChatMessage) => `${msg.sender === 'user' ? 'ユーザー' : 'AI'}: ${msg.text}`).join('\n');

      const prompt = `
        以下のチャット履歴は、就職活動中の学生が「${industryName}」という業界についてリサーチした内容です。
        この履歴を分析し、学生が業界理解を深められるよう、以下のJSON形式で要点をまとめてください。

        - structure: 業界の構造やビジネスモデルについて3点でまとめてください。
        - trends: 業界の最新トレンドや将来性について3点でまとめてください。
        - main_players: 業界の主要な企業やプレイヤーを3社挙げ、それぞれの特徴を簡潔に説明してください。
        - strengths_weaknesses: 業界全体の強みと弱み（課題）をそれぞれ2点ずつ挙げてください。
        - personal_thoughts: この業界で働く上で、学生がアピールできそうな自身の気づきや考察を促すような、問いかける形の文章を150字程度で生成してください。

        チャット履歴:
        ---
        ${historyText}
        ---

        JSON出力:
      `;

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
        const response = await generateTextWithJsonOutput(prompt, apiKey);
        if (response.error) {
          throw new Error(response.error);
        }
        const parsedSummary = JSON.parse(response.text);
        setSummary(parsedSummary.summary || parsedSummary);
      } catch (e: any) {
        console.error("Failed to generate or parse summary:", e);
        setError(`要約の生成に失敗しました。詳細: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    generateSummary();
  }, [industryName, chatHistory]);

  const renderList = (title: string, items: string[] | undefined) => (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {items && items.length > 0 ? (
        <ul className="list-disc list-inside pl-2 space-y-1 text-gray-600">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-gray-500">情報がありません。</p>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            リサーチまとめ: {industryName}
          </h1>
          <Link to="/industry-analysis">
            <Button variant="secondary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
              チャットに戻る
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner text="AIがチャット履歴を分析・要約しています..." />
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
            <strong className="font-bold">エラー: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {summary && !isLoading && !error && (
          <div className="space-y-6">
            {renderList("業界構造", summary.structure)}
            {renderList("主要企業", summary.main_players)}
            {renderList("強み・弱み", summary.strengths_weaknesses)}
            {renderList("トレンド", summary.trends)}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">自分の気づき</h3>
              <p className="p-4 bg-blue-50 border border-blue-200 rounded-md text-gray-800">{summary.personal_thoughts}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IndustrySummaryScreen;