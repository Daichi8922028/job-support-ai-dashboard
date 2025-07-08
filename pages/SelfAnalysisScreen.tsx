
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Node, Connection, PaletteItem, AiGlobalAnalysis, ConnectorPoint, NodeDetails } from '../types';
import { PALETTE_ITEMS, APP_NAME, NODE_WIDTH, NODE_HEIGHT, CONNECTOR_SIZE } from '../constants';
import NodeComponent from '../components/self-analysis/NodeComponent';
import EditNodeModal from '../components/self-analysis/EditNodeModal';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { DocumentTextIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { isApiKeyConfigured } from '../services/geminiService'; // Import the check function

const SelfAnalysisScreen: React.FC = () => {
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [aiGlobalOutput, setAiGlobalOutput] = useState<AiGlobalAnalysis | null>(null);
  const [isLoadingGlobalAi, setIsLoadingGlobalAi] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [drawingConnection, setDrawingConnection] = useState<{ fromNodeId: string; fromConnector: 'top' | 'bottom' | 'left' | 'right'; toMouseX: number; toMouseY: number} | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const apiKeyIsSet = useMemo(() => isApiKeyConfigured(), []);

  // --- Unique ID Generation ---
  const generateId = () => `id-${self.crypto.randomUUID()}`;

  // --- Node Operations ---
  const addNode = (paletteItem: PaletteItem, x: number, y: number, customLabel?: string, customDetails?: Partial<NodeDetails>, isComplete?: boolean) => {
    const newNodeId = generateId();
    const newNode: Node = {
      id: newNodeId,
      label: customLabel || paletteItem.label,
      paletteItemId: paletteItem.id,
      x: Math.max(0, x - NODE_WIDTH / 2), // Adjust to center roughly
      y: Math.max(0, y - NODE_HEIGHT / 2),
      isComplete: isComplete || false,
      details: {
        ...paletteItem.defaultDetails,
        ...customDetails,
        experience: customDetails?.experience ? {...paletteItem.defaultDetails.experience, ...customDetails.experience} : paletteItem.defaultDetails.experience,
        trait: customDetails?.trait ? {...paletteItem.defaultDetails.trait, ...customDetails.trait} : paletteItem.defaultDetails.trait,
      }
    };
    setNodes(prev => ({ ...prev, [newNodeId]: newNode }));
    return newNodeId;
  };

  const updateNode = (updatedNode: Node) => {
    setNodes(prev => ({ ...prev, [updatedNode.id]: updatedNode }));
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => {
      const newNodes = { ...prev };
      delete newNodes[nodeId];
      return newNodes;
    });
    setConnections(prev => prev.filter(conn => conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };
  
  // --- Drag and Drop: Palette to Canvas ---
  const handleDragStartPaletteItem = (e: React.DragEvent<HTMLDivElement>, paletteItem: PaletteItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(paletteItem));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOverCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const paletteItemJson = e.dataTransfer.getData('application/json');
    if (!paletteItemJson || !canvasRef.current) return;

    const paletteItem = JSON.parse(paletteItemJson) as PaletteItem;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    addNode(paletteItem, x, y);
  };

  // --- Node Dragging on Canvas ---
  const handleNodeMouseDown = (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    if (e.button !== 0) return; // Only main button
    const node = nodes[nodeId];
    if (!node || !canvasRef.current) return;
    setSelectedNodeId(nodeId);

    setDraggingNodeId(nodeId);
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - canvasRect.left - node.x,
      y: e.clientY - canvasRect.top - node.y,
    });
    e.stopPropagation(); 
  };
  
  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (draggingNodeId && nodes[draggingNodeId] && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      let newX = e.clientX - canvasRect.left - dragOffset.x;
      let newY = e.clientY - canvasRect.top - dragOffset.y;
      
      // Keep node within canvas bounds (approx)
      newX = Math.max(0, Math.min(newX, canvasRect.width - NODE_WIDTH));
      newY = Math.max(0, Math.min(newY, canvasRect.height - NODE_HEIGHT));

      setNodes(prev => ({
        ...prev,
        [draggingNodeId]: { ...prev[draggingNodeId], x: newX, y: newY },
      }));
    } else if (drawingConnection && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setDrawingConnection(prev => prev ? ({
            ...prev,
            toMouseX: e.clientX - canvasRect.left,
            toMouseY: e.clientY - canvasRect.top,
        }) : null);
    }
  }, [draggingNodeId, dragOffset, nodes, drawingConnection]);

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingNodeId(null);
    setDrawingConnection(null); // Stop drawing line if mouse is up anywhere
  }, []);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement) {
        // Use native event listeners on window for mouse move/up to capture events outside canvas
        window.addEventListener('mousemove', handleCanvasMouseMove);
        window.addEventListener('mouseup', handleCanvasMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleCanvasMouseMove);
            window.removeEventListener('mouseup', handleCanvasMouseUp);
        };
    }
  }, [handleCanvasMouseMove, handleCanvasMouseUp]);


  // --- Node Connections ---
  const getConnectorPointCoords = (nodeId: string, side: 'top' | 'bottom' | 'left' | 'right'): ConnectorPoint | null => {
    const node = nodes[nodeId];
    if (!node) return null;
    let x = node.x;
    let y = node.y;
    if (side === 'top') { x += NODE_WIDTH / 2; }
    else if (side === 'bottom') { x += NODE_WIDTH / 2; y += NODE_HEIGHT; }
    else if (side === 'left') { y += NODE_HEIGHT / 2; }
    else if (side === 'right') { x += NODE_WIDTH; y += NODE_HEIGHT / 2; }
    return { nodeId, side, x, y };
  };

  const handleConnectorMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    nodeId: string,
    connectorSide: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setDrawingConnection({
      fromNodeId: nodeId,
      fromConnector: connectorSide,
      toMouseX: e.clientX - canvasRect.left,
      toMouseY: e.clientY - canvasRect.top,
    });
  };

  const handleConnectorMouseUpOnNode = (
    _e: React.MouseEvent<HTMLDivElement>, // Use general mouse up on canvas to complete
    toNodeId: string
  ) => {
    if (drawingConnection && drawingConnection.fromNodeId !== toNodeId) {
      // Find the closest connector point on the target node
      const targetNode = nodes[toNodeId];
      if (!targetNode || !canvasRef.current) return;

      const { toMouseX, toMouseY } = drawingConnection;
      let closestSide: 'top' | 'bottom' | 'left' | 'right' = 'top';
      let minDistance = Infinity;

      (['top', 'bottom', 'left', 'right'] as const).forEach(side => {
        const point = getConnectorPointCoords(toNodeId, side);
        if (point) {
          const distance = Math.sqrt(Math.pow(point.x - toMouseX, 2) + Math.pow(point.y - toMouseY, 2));
          if (distance < minDistance) {
            minDistance = distance;
            closestSide = side;
          }
        }
      });
      
      const newConnection: Connection = {
        id: generateId(),
        fromNodeId: drawingConnection.fromNodeId,
        fromConnector: drawingConnection.fromConnector,
        toNodeId: toNodeId,
        toConnector: closestSide,
      };
      // Avoid duplicate connections
      if (!connections.some(c => 
        (c.fromNodeId === newConnection.fromNodeId && c.toNodeId === newConnection.toNodeId) ||
        (c.fromNodeId === newConnection.toNodeId && c.toNodeId === newConnection.fromNodeId)
      )) {
        setConnections(prev => [...prev, newConnection]);
      }
    }
    setDrawingConnection(null);
  };
  
  // --- Modal ---
  const handleOpenEditModal = (nodeId: string) => {
    setEditingNodeId(nodeId);
  };

  const handleCloseEditModal = () => {
    setEditingNodeId(null);
  };

  const handleSaveNode = (updatedNode: Node) => {
    updateNode(updatedNode);
    // Handle AI-suggested trait creation
    if (updatedNode.details.experience?.aiStrengthSuggestions || updatedNode.details.experience?.aiWeaknessSuggestions) {
      const expDetails = updatedNode.details.experience;
      const strengthPaletteItem = PALETTE_ITEMS.find(p => p.id === 'trait-strength');
      const weaknessPaletteItem = PALETTE_ITEMS.find(p => p.id === 'trait-weakness');

      const createdTraitNodeIds: string[] = [];

      expDetails.aiStrengthSuggestions?.forEach((strength, index) => {
        if (strengthPaletteItem) {
          const traitNodeId = addNode(
            strengthPaletteItem, 
            updatedNode.x + NODE_WIDTH + 20, 
            updatedNode.y + index * (NODE_HEIGHT + 10),
            strength,
            { trait: { description: `経験「${updatedNode.label}」から抽出された強み。` } },
            true
          );
          createdTraitNodeIds.push(traitNodeId);
        }
      });
      expDetails.aiWeaknessSuggestions?.forEach((weakness, index) => {
        if (weaknessPaletteItem) {
         const traitNodeId = addNode(
            weaknessPaletteItem, 
            updatedNode.x + NODE_WIDTH + 20, 
            updatedNode.y + (expDetails.aiStrengthSuggestions?.length || 0 + index) * (NODE_HEIGHT + 10),
            weakness,
            { trait: { description: `経験「${updatedNode.label}」から抽出された弱み。` } },
            true
          );
          createdTraitNodeIds.push(traitNodeId);
        }
      });
      // Auto-connect extracted traits to the source experience node
      createdTraitNodeIds.forEach(traitNodeId => {
        setConnections(prev => [...prev, {
          id: generateId(),
          fromNodeId: updatedNode.id, fromConnector: 'right',
          toNodeId: traitNodeId, toConnector: 'left'
        }]);
      });
      // Clear suggestions after processing
      const finalNode = nodes[updatedNode.id] || updatedNode; // Use latest from state if available
      if (finalNode.details.experience) {
          delete finalNode.details.experience.aiStrengthSuggestions;
          delete finalNode.details.experience.aiWeaknessSuggestions;
          updateNode(finalNode);
      }
    }
    setEditingNodeId(null);
  };

  // --- AI Functions (Mocks) ---
  const mockGenerateOverallPRAndGakuchika = async (nodesData: string): Promise<AiGlobalAnalysis> => {
    setIsLoadingGlobalAi(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    const numNodes = Object.keys(nodes).length;
    setIsLoadingGlobalAi(false);
    return {
      selfPR: `これはAIが生成した自己PRです。${numNodes}個のノード情報（${nodesData.substring(0,50)}...）を元に、あなたの魅力やポテンシャルを最大限に引き出す文章を作成しました。約400字でまとめています。さらなる改善点や具体的なエピソードを盛り込むことで、より説得力のあるPRになります。`,
      gakuchika: `これはAIが生成したガクチカ（学生時代に力を入れたこと）です。あなたの経験や特性から、特に企業にアピールできるポイントを抽出し、具体的な行動や成果を交えながら記述しました。約600字です。STARメソッドなどを活用して、より詳細な情報を提供すると、深みが増します。`,
    };
  };

  const handleGenerateGlobalAnalysis = async () => {
    if (!apiKeyIsSet) {
        alert("Gemini APIキーが設定されていません。この機能は利用できません。");
        return;
    }
    const nodesContent = Object.values(nodes).map(n => {
      let content = `ノード「${n.label}」(${PALETTE_ITEMS.find(p=>p.id === n.paletteItemId)?.type}): `;
      if (n.details.experience) {
        const exp = n.details.experience;
        content += `フレームワーク: ${exp.activeFramework}. `;
        const details = exp.activeFramework === 'star' ? exp.star : exp.custom;
        content += Object.entries(details).map(([k,v]) => `${k}: ${v}`).join(', ');
      } else if (n.details.trait) {
        content += `説明: ${n.details.trait.description}`;
      }
      return content;
    }).join('\n');
    
    const result = await mockGenerateOverallPRAndGakuchika(nodesContent);
    setAiGlobalOutput(result);
  };
  
  const mockGenerateDeepDiveQuestions = async (nodeId: string, experienceDetails: NodeDetails['experience']): Promise<string[] | null> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (!experienceDetails) return null;
    const { situation, task, action, result } = experienceDetails.star; // Example, adapt based on active framework
    return [
      `その経験（${situation}）の中で、最も困難だった点は何ですか？`,
      `目標（${task}）を達成するために、具体的にどのような工夫をしましたか？`,
      `その行動（${action}）の結果（${result}）から、何を学び、今後にどう活かしたいですか？`
    ];
  };

  const mockExtractTraits = async (nodeId: string, experienceDetails: NodeDetails['experience']): Promise<{ strengths: string[], weaknesses: string[] } | null> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (!experienceDetails) return null;
     // Simple mock based on keywords. Real AI would be more sophisticated.
    const combinedText = Object.values(experienceDetails.star).join(' ') + Object.values(experienceDetails.custom).join(' ');
    const strengths = [];
    if (combinedText.includes("リーダー") || combinedText.includes("主体")) strengths.push("リーダーシップ");
    if (combinedText.includes("解決") || combinedText.includes("分析")) strengths.push("問題解決能力");
    if (strengths.length === 0) strengths.push("協調性 (AI提案)");
    
    const weaknesses = [];
    if (combinedText.includes("苦手") || combinedText.includes("時間")) weaknesses.push("時間管理 (AI提案)");
    if (weaknesses.length === 0) weaknesses.push("計画性 (AI提案)");

    return { strengths, weaknesses };
  };


  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-3 flex justify-between items-center sticky top-0 z-30">
        <h1 className="text-xl font-semibold text-blue-600">{APP_NAME} - 自己分析マップ</h1>
        <Button 
          onClick={handleGenerateGlobalAnalysis} 
          isLoading={isLoadingGlobalAi} 
          leftIcon={<SparklesIcon className="w-5 h-5"/>}
          disabled={!apiKeyIsSet || isLoadingGlobalAi}
          title={!apiKeyIsSet ? "Gemini APIキーが設定されていません。" : "AIでマップ全体を文章化"}
        >
          AIで全体を言語化
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Palette */}
        <aside className="w-60 bg-white p-3 space-y-3 border-r overflow-y-auto">
          {Object.entries(PALETTE_ITEMS.reduce((acc, item) => {
            if (!acc[item.group]) acc[item.group] = [];
            acc[item.group].push(item);
            return acc;
          }, {} as Record<string, PaletteItem[]>)).map(([groupName, items]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-gray-700 mb-1.5">{groupName}</h3>
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStartPaletteItem(e, item)}
                    className={`p-2.5 mb-1.5 rounded-md border flex items-center space-x-2 cursor-grab hover:shadow-md transition-shadow ${item.color}`}
                  >
                    <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <span className="text-xs text-gray-800">{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
           {selectedNodeId && nodes[selectedNodeId] && (
            <div className="pt-4 border-t mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1.5">選択中: {nodes[selectedNodeId].label}</h3>
                <Button onClick={() => deleteNode(selectedNodeId)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-4 h-4"/>} className="w-full">
                    ノードを削除
                </Button>
            </div>
            )}
        </aside>

        {/* Main Canvas */}
        <main 
            ref={canvasRef} 
            className="flex-1 bg-gray-50 relative overflow-auto" // overflow-auto to allow canvas bigger than screen
            onDragOver={handleDragOverCanvas}
            onDrop={handleDropCanvas}
            onClick={() => setSelectedNodeId(null)} // Deselect node if canvas is clicked
        >
          {Object.values(nodes).map(node => (
            <NodeComponent
              key={node.id}
              node={node}
              onMouseDown={handleNodeMouseDown}
              onDoubleClick={() => handleOpenEditModal(node.id)}
              onConnectorMouseDown={handleConnectorMouseDown}
              isSelected={node.id === selectedNodeId}
              onMouseUpOnNode={handleConnectorMouseUpOnNode} // Pass down the handler
            />
          ))}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ minWidth: '1000px', minHeight: '800px' }}> {/* Ensure SVG is large enough */}
            {connections.map(conn => {
              const fromPoint = getConnectorPointCoords(conn.fromNodeId, conn.fromConnector);
              const toPoint = getConnectorPointCoords(conn.toNodeId, conn.toConnector);
              if (!fromPoint || !toPoint) return null;
              return (
                <line
                  key={conn.id}
                  x1={fromPoint.x}
                  y1={fromPoint.y}
                  x2={toPoint.x}
                  y2={toPoint.y}
                  stroke="#60a5fa" // blue-400
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
              );
            })}
            {drawingConnection && (() => {
                const fromPoint = getConnectorPointCoords(drawingConnection.fromNodeId, drawingConnection.fromConnector);
                if (!fromPoint) return null;
                return (
                    <line
                        x1={fromPoint.x}
                        y1={fromPoint.y}
                        x2={drawingConnection.toMouseX}
                        y2={drawingConnection.toMouseY}
                        stroke="#9ca3af" // gray-400
                        strokeWidth="2"
                        strokeDasharray="4 2"
                    />
                );
            })()}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
              </marker>
            </defs>
          </svg>
        </main>
      </div>

      {/* Bottom AI Output Panel */}
      {aiGlobalOutput && (
        <Card title="AIによる全体言語化結果" className="m-2 sticky bottom-0 z-20 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="font-semibold text-gray-700 text-sm mb-1">自己PR (約400字)</h4>
              <p className="text-xs p-2 bg-gray-100 rounded whitespace-pre-line">{aiGlobalOutput.selfPR}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 text-sm mb-1">ガクチカ (約600字)</h4>
              <p className="text-xs p-2 bg-gray-100 rounded whitespace-pre-line">{aiGlobalOutput.gakuchika}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Node Modal */}
      {editingNodeId && nodes[editingNodeId] && (
        <EditNodeModal
          node={nodes[editingNodeId]}
          onClose={handleCloseEditModal}
          onSave={handleSaveNode}
          onGenerateDeepDiveQuestions={mockGenerateDeepDiveQuestions}
          onExtractTraits={mockExtractTraits}
          apiKeyIsSet={apiKeyIsSet} // Pass API key status
        />
      )}
    </div>
  );
};

export default SelfAnalysisScreen;
