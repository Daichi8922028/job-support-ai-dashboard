import React from 'react';

// 業界データ型
export interface Industry {
  id: string;
  name: string;
}

interface IndustryListProps {
  industries: Industry[];
  selectedIndustryId: string | null;
  onSelectIndustry: (industryId: string) => void;
  onAddNewIndustry: () => void;
}

const IndustryList: React.FC<IndustryListProps> = ({
  industries,
  selectedIndustryId,
  onSelectIndustry,
  onAddNewIndustry,
}) => {
  return (
    <div className="w-full md:w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">業界リスト</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        <div className="space-y-2">
          {industries.map((industry) => (
            <button
              key={industry.id}
              onClick={() => onSelectIndustry(industry.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                selectedIndustryId === industry.id
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <p className="font-semibold">{industry.name}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border-t">
        <button
          onClick={onAddNewIndustry}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          新しい業界を分析
        </button>
      </div>
    </div>
  );
};

export default IndustryList;