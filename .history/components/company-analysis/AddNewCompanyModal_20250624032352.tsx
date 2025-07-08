import React, { useState, ChangeEvent } from 'react';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import { DEFAULT_INDUSTRIES } from '../../constants';

interface AddNewCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompany: (companyName: string, industry: string) => void;
}

const AddNewCompanyModal: React.FC<AddNewCompanyModalProps> = ({ isOpen, onClose, onAddCompany }) => {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  const handleAdd = () => {
    if (!companyName || !industry) {
      alert('企業名と業界を入力してください。');
      return;
    }
    onAddCompany(companyName, industry);
    setCompanyName('');
    setIndustry('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">新しい企業を分析</h2>
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
            options={[
              { value: '', label: '業界を選択してください' },
              ...DEFAULT_INDUSTRIES.map(ind => ({ value: ind, label: ind }))
            ]}
          />
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleAdd}>
            分析を開始
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNewCompanyModal;