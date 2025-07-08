
import React, { useState, useEffect, ChangeEvent, useMemo } from 'react';
import { Node, NodeDetails, FrameworkType, PaletteItem } from '../../types';
import { PALETTE_ITEMS } from '../../constants';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import { XMarkIcon, SparklesIcon, DocumentTextIcon, CheckIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

interface EditNodeModalProps {
  node: Node | null;
  onClose: () => void;
  onSave: (updatedNode: Node) => void;
  onGenerateDeepDiveQuestions: (nodeId: string, experienceDetails: NodeDetails['experience']) => Promise<string[] | null>;
  onExtractTraits: (nodeId: string, experienceDetails: NodeDetails['experience']) => Promise<{ strengths: string[], weaknesses: string[] } | null>;
  apiKeyIsSet: boolean; // Receive API key status as a prop
}

const EditNodeModal: React.FC<EditNodeModalProps> = ({
  node,
  onClose,
  onSave,
  onGenerateDeepDiveQuestions,
  onExtractTraits,
  apiKeyIsSet, // Use the prop
}) => {
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isRefiningField, setIsRefiningField] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      // Deep copy node to prevent direct state mutation
      setCurrentNode(JSON.parse(JSON.stringify(node)));
    } else {
      setCurrentNode(null);
    }
  }, [node]);

  if (!currentNode) return null;

  const paletteItem = PALETTE_ITEMS.find(p => p.id === currentNode.paletteItemId);
  if (!paletteItem) return null;

  const isExperienceNode = paletteItem.type === 'experience';
  const experienceDetails = currentNode.details.experience;
  const traitDetails = currentNode.details.trait;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (isExperienceNode && experienceDetails) {
      const framework = experienceDetails.activeFramework;
      if (name in experienceDetails[framework]) {
        setCurrentNode(prevNode => prevNode ? {
          ...prevNode,
          details: {
            ...prevNode.details,
            experience: {
              ...experienceDetails,
              [framework]: {
                ...experienceDetails[framework],
                [name]: value,
              },
            },
          },
        } : null);
      } else if (name === 'label') {
         setCurrentNode(prevNode => prevNode ? {...prevNode, label: value } : null);
      }
    } else if (!isExperienceNode && traitDetails) {
      if (name === 'description') {
        setCurrentNode(prevNode => prevNode ? {
          ...prevNode,
          details: { ...prevNode.details, trait: { ...traitDetails, description: value } },
        } : null);
      } else if (name === 'label') {
        setCurrentNode(prevNode => prevNode ? {...prevNode, label: value } : null);
      }
    }
  };

  const handleFrameworkChange = (newFramework: FrameworkType) => {
    if (isExperienceNode && experienceDetails) {
      setCurrentNode(prevNode => prevNode ? {
        ...prevNode,
        details: {
          ...prevNode.details,
          experience: { ...experienceDetails, activeFramework: newFramework },
        },
      } : null);
    }
  };
  
  const handleDeepDiveAnswerChange = (index: number, answer: string) => {
    if (isExperienceNode && experienceDetails) {
      setCurrentNode(prevNode => prevNode ? {
        ...prevNode,
        details: {
          ...prevNode.details,
          experience: {
            ...experienceDetails,
            deepDive: {
              ...experienceDetails.deepDive,
              answers: { ...experienceDetails.deepDive.answers, [index]: answer },
            },
          },
        },
      } : null);
    }
  };

  const handleDeepDiveQuestionGeneration = async () => {
    if (!isExperienceNode || !experienceDetails || !currentNode || !apiKeyIsSet) {
        if (!apiKeyIsSet) alert("Gemini APIキーが設定されていません。この機能は利用できません。");
        return;
    }
    setIsLoadingAi(true);
    const questions = await onGenerateDeepDiveQuestions(currentNode.id, experienceDetails);
    if (questions && questions.length > 0) {
      setCurrentNode(prev => prev ? ({
        ...prev,
        details: {
          ...prev.details,
          experience: {
            ...experienceDetails,
            deepDive: { questions, answers: {}, currentIndex: 0 },
          },
        },
      }) : null);
    }
    setIsLoadingAi(false);
  };
  
  const handleTraitExtraction = async () => {
    if (!isExperienceNode || !experienceDetails || !currentNode || !apiKeyIsSet) {
      if (!apiKeyIsSet) alert("Gemini APIキーが設定されていません。この機能は利用できません。");
      return;
    }
    setIsLoadingAi(true);
    const traits = await onExtractTraits(currentNode.id, experienceDetails);
     if (traits && currentNode) { 
      setCurrentNode(prev => {
        if (!prev || !prev.details.experience) return prev;
        return {
          ...prev,
          details: {
            ...prev.details,
            experience: {
              ...prev.details.experience,
              aiStrengthSuggestions: traits.strengths,
              aiWeaknessSuggestions: traits.weaknesses,
            }
          }
        }
      });
    }
    setIsLoadingAi(false);
  };

  const handleRefineText = async (fieldName: string, currentText: string) => {
    if (!apiKeyIsSet) {
      alert("Gemini APIキーが設定されていません。この機能は利用できません。");
      return;
    }
    setIsRefiningField(fieldName);
    // Simulate AI call for refinement
    await new Promise(resolve => setTimeout(resolve, 1500));
    const refinedText = `（AIによる推敲結果）${currentText} ... このように改善しました。`;
    
    if (isExperienceNode && experienceDetails && currentNode) {
      const framework = experienceDetails.activeFramework;
      setCurrentNode({
        ...currentNode,
        details: {
          ...currentNode.details,
          experience: {
            ...experienceDetails,
            [framework]: {
              ...experienceDetails[framework],
              [fieldName]: refinedText,
            },
          },
        },
      });
    }
    setIsRefiningField(null);
  };


  const handleSave = () => {
    if (currentNode) {
      let isComplete = false;
      if (isExperienceNode && experienceDetails) {
        const fw = experienceDetails.activeFramework;
        isComplete = Object.values(experienceDetails[fw]).every(val => (val as string).trim() !== '');
      } else if (!isExperienceNode && traitDetails) {
        isComplete = traitDetails.description.trim() !== '';
      }
      onSave({ ...currentNode, isComplete });
    }
  };
  
  const renderFrameworkFields = () => {
    if (!isExperienceNode || !experienceDetails) return null;
    const { activeFramework, star, custom } = experienceDetails;
    const fields = activeFramework === 'star' ? star : custom;
    const labels = activeFramework === 'star' 
      ? { situation: '状況 (Situation)', task: '課題 (Task)', action: '行動 (Action)', result: '結果 (Result)' }
      : { target: '目標 (Target)', issue: '課題 (Issue)', action: '行動 (Action)', result: '結果 (Result)', learning: '学び (Learning)' };

    return (
      <div className="space-y-3">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-0.5">{labels[key as keyof typeof labels]}</label>
            <div className="flex items-start space-x-2">
              <textarea
                name={key}
                value={value as string}
                onChange={handleInputChange}
                rows={3}
                className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder={`${labels[key as keyof typeof labels]}を入力...`}
              />
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => handleRefineText(key, value as string)}
                isLoading={isRefiningField === key}
                disabled={!apiKeyIsSet || !!isRefiningField}
                title={!apiKeyIsSet ? "Gemini APIキーが設定されていません。" : "AIと推敲"}
                className="text-blue-600 hover:bg-blue-50 h-full"
              >
                <PencilSquareIcon className="w-4 h-4 mr-1"/> AIと推敲
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };


  const Icon = paletteItem.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Icon className="w-6 h-6 text-gray-600" />
            <Input 
                name="label"
                value={currentNode.label}
                onChange={handleInputChange}
                className="text-lg font-semibold text-gray-800 border-none focus:ring-0 p-0"
            />
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {isExperienceNode && experienceDetails && (
            <>
              {/* Framework Selector */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm font-medium text-gray-700">フレームワーク:</span>
                {(['star', 'custom'] as FrameworkType[]).map(fw => (
                  <Button
                    key={fw}
                    size="sm"
                    variant={experienceDetails.activeFramework === fw ? 'primary' : 'secondary'}
                    onClick={() => handleFrameworkChange(fw)}
                  >
                    {fw.toUpperCase()}
                  </Button>
                ))}
              </div>
              
              {renderFrameworkFields()}

              {/* AI Strength/Weakness Suggestions Display (if any) */}
              {(experienceDetails.aiStrengthSuggestions || experienceDetails.aiWeaknessSuggestions) && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                  <h4 className="text-sm font-semibold text-indigo-700 mb-1.5 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-1.5 text-indigo-500"/> AIによる特性の提案
                  </h4>
                  {experienceDetails.aiStrengthSuggestions && experienceDetails.aiStrengthSuggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600">強み候補:</p>
                      <ul className="list-disc list-inside pl-2">
                        {experienceDetails.aiStrengthSuggestions.map((s, i) => <li key={`str-${i}`} className="text-xs text-gray-700">{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {experienceDetails.aiWeaknessSuggestions && experienceDetails.aiWeaknessSuggestions.length > 0 && (
                     <div className="mt-1">
                      <p className="text-xs font-medium text-gray-600">弱み候補:</p>
                      <ul className="list-disc list-inside pl-2">
                        {experienceDetails.aiWeaknessSuggestions.map((w, i) => <li key={`wk-${i}`} className="text-xs text-gray-700">{w}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-indigo-600 mt-1.5">これらの特性は保存時に新しいノードとして自動的に追加・接続されます。</p>
                </div>
              )}

              {/* AI Actions for Experience */}
              <div className="pt-3 border-t space-y-2">
                 <h4 className="text-sm font-medium text-gray-700">AI支援機能 (経験ノード)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button 
                        onClick={handleDeepDiveQuestionGeneration} 
                        isLoading={isLoadingAi && !experienceDetails.deepDive.questions.length} // Only show loading if no questions yet
                        disabled={!apiKeyIsSet || isLoadingAi}
                        leftIcon={<SparklesIcon className="w-4 h-4"/>}
                        title={!apiKeyIsSet ? "Gemini APIキーが設定されていません。" : "AIが深掘り質問を生成"}
                        variant="secondary"
                    >
                        深掘り質問を生成
                    </Button>
                    <Button 
                        onClick={handleTraitExtraction} 
                        isLoading={isLoadingAi && !experienceDetails.aiStrengthSuggestions} // Example loading condition
                        disabled={!apiKeyIsSet || isLoadingAi}
                        leftIcon={<SparklesIcon className="w-4 h-4"/>}
                        title={!apiKeyIsSet ? "Gemini APIキーが設定されていません。" : "AIが経験から強み・弱みを抽出"}
                        variant="secondary"
                    >
                        強み・弱みを抽出
                    </Button>
                </div>
              </div>

              {/* Deep Dive Questions */}
              {experienceDetails.deepDive.questions.length > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">AIによる深掘り質問:</h4>
                  {experienceDetails.deepDive.questions.map((q, index) => (
                    <div key={index} className={`mb-2 p-2 rounded ${index === experienceDetails.deepDive.currentIndex ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <p className="text-sm text-blue-700 font-semibold">{`質問 ${index + 1}: ${q}`}</p>
                      <textarea
                        value={experienceDetails.deepDive.answers[index] || ''}
                        onChange={(e) => handleDeepDiveAnswerChange(index, e.target.value)}
                        placeholder="回答を入力..."
                        rows={2}
                        className="w-full mt-1 p-1.5 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  ))}
                  {experienceDetails.deepDive.questions.length > 1 && (
                     <div className="flex justify-between mt-1">
                        <Button 
                            size="sm" 
                            onClick={() => setCurrentNode(prev => prev ? ({...prev, details: {...prev.details, experience: {...experienceDetails, deepDive: {...experienceDetails.deepDive, currentIndex: Math.max(0, experienceDetails.deepDive.currentIndex - 1)}}}}): null)}
                            disabled={experienceDetails.deepDive.currentIndex === 0}
                        >
                            前の質問
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => setCurrentNode(prev => prev ? ({...prev, details: {...prev.details, experience: {...experienceDetails, deepDive: {...experienceDetails.deepDive, currentIndex: Math.min(experienceDetails.deepDive.questions.length - 1, experienceDetails.deepDive.currentIndex + 1)}}}}) : null)}
                            disabled={experienceDetails.deepDive.currentIndex === experienceDetails.deepDive.questions.length - 1}
                        >
                            次の質問
                        </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!isExperienceNode && traitDetails && (
            <div>
              <label htmlFor="traitDescription" className="block text-sm font-medium text-gray-700 mb-1">
                特性の説明
              </label>
              <textarea
                id="traitDescription"
                name="description"
                value={traitDetails.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="特性に関する詳細な説明やエピソードを入力..."
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <Button onClick={onClose} variant="secondary">
            キャンセル
          </Button>
          <Button onClick={handleSave} variant="primary" leftIcon={<CheckIcon className="w-5 h-5"/>}>
            保存して閉じる
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditNodeModal;
