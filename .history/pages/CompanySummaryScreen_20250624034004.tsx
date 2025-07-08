import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { generateTextWithJsonOutput } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChatMessage } from '../types';

interface Summary {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  es_pr_point: string;
  interview_question: string;
}

const CompanySummaryScreen: React.FC = () => {
  const location = useLocation();
  const { companyName, chatHistory } = location.state || { companyName: '不明な企業', chatHistory: [] };

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
        以下のチャット履歴は、就職活動中の学生が「${companyName}」という企業についてリサーチした内容です。
        この履歴を分析し、学生が面接やES作成に活用できるよう、以下のJSON形式で要点をまとめてください。

        - strengths: 企業の強みを3点挙げてください。
        - weaknesses: 企業の弱み・課題を2点挙げてください。
        - opportunities: 企業にとっての機会（市場の成長など）を2点挙げてください。
        - threats: 企業にとっての脅威（競合、規制など）を2点挙げてください。
        - es_pr_point: 学生が自己PRと絡めて企業にアピールできるポイントを、具体的な例文として150字程度で記述してください。
        - interview_question: この企業分析を踏まえて、面接で聞かれそうな少し意地悪な質問を1つ作成してください。

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
        setSummary(parsedSummary.summary); // Assuming the API returns { "summary": { ... } }
      } catch (e: any) {
        console.error("Failed to generate or parse summary:", e);
        setError(`要約の生成に失敗しました。詳細: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    generateSummary();
  }, [companyName, chatHistory]);

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
            リサーチまとめ: {companyName}
          </h1>
          <Link to="/company-analysis">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderList("企業の強み (Strengths)", summary.strengths)}
              {renderList("企業の弱み (Weaknesses)", summary.weaknesses)}
              {renderList("事業機会 (Opportunities)", summary.opportunities)}
              {renderList("事業脅威 (Threats)", summary.threats)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">ES/面接用 PRポイント</h3>
              <p className="p-4 bg-blue-50 border border-blue-200 rounded-md text-gray-800">{summary.es_pr_point}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">想定される質問</h3>
              <p className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-gray-800">{summary.interview_question}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CompanySummaryScreen;