import React from 'react';

// 仮の企業データ型
export interface Company {
  id: string;
  name: string;
  industry: string;
}

interface CompanyListProps {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  onAddNewCompany: () => void;
}

const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  onAddNewCompany,
}) => {
  return (
    <div className="w-full md:w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">企業リスト</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        <div className="space-y-2">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                selectedCompanyId === company.id
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <p className="font-semibold">{company.name}</p>
              <p className="text-xs text-gray-500">{company.industry}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border-t">
        <button
          onClick={onAddNewCompany}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          新しい企業を分析
        </button>
      </div>
    </div>
  );
};

export default CompanyList;