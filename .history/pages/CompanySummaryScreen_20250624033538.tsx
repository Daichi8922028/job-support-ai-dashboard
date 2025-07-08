import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

const CompanySummaryScreen: React.FC = () => {
  const location = useLocation();
  const { companyName, chatHistory } = location.state || { companyName: '不明な企業', chatHistory: [] };

  // ここでchatHistoryを要約するロジックを後ほど追加
  const summary = `「${companyName}」のチャット履歴に基づいたリサーチのまとめです。\n\n- 強み: ...\n- 弱み: ...\n- 将来性: ...\n\n（この内容は現在ダミーです。今後AIによる自動要約機能が実装されます。）`;

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
        <div className="prose max-w-none p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-semibold">AIによる分析サマリー</h2>
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      </Card>
    </div>
  );
};

export default CompanySummaryScreen;