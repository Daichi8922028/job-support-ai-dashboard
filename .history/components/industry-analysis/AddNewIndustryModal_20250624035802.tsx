import React, { useState } from 'react';
import Input from '../Input';
import Button from '../Button';

interface AddNewIndustryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndustry: (industryName: string) => void;
}

const AddNewIndustryModal: React.FC<AddNewIndustryModalProps> = ({ isOpen, onClose, onAddIndustry }) => {
  const [industryName, setIndustryName] = useState('');

  const handleAdd = () => {
    if (!industryName) {
      alert('業界名を入力してください。');
      return;
    }
    onAddIndustry(industryName);
    setIndustryName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">新しい業界を分析</h2>
        <div className="space-y-4">
          <Input
            label="業界名"
            value={industryName}
            onChange={(e) => setIndustryName(e.target.value)}
            placeholder="例: IT業界"
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

export default AddNewIndustryModal;