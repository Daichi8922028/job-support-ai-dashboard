
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Node, Connection, PaletteItem, SelfAnalysisResult, ConnectorPoint, NodeDetails } from '../types';
import { PALETTE_ITEMS, APP_NAME, NODE_WIDTH, NODE_HEIGHT, CONNECTOR_SIZE } from '../constants';
import NodeComponent from '../components/self-analysis/NodeComponent';
import EditNodeModal from '../components/self-analysis/EditNodeModal';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { DocumentTextIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  isApiKeyConfigured,
  extractTraitsFromExperience,
  generateDeepDiveQuestions,
  generateSelfAnalysis
} from '../services/geminiService';
import { saveSelfAnalysisMap, loadSelfAnalysisMap } from '../services/selfAnalysisMapService';
import { useAuth } from '../contexts/AuthContext';

const SelfAnalysisScreen: React.FC = () => {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selfAnalysisResult, setSelfAnalysisResult] = useState<SelfAnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [mapTitle, setMapTitle] = useState<string>('私の自己分析マップ');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [drawingConnection, setDrawingConnection] = useState<{ fromNodeId: string; fromConnector: 'top' | 'bottom' | 'left' | 'right'; toMouseX: number; toMouseY: number} | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

  const apiKeyIsSet = useMemo(() => isApiKeyConfigured(), []);

  // Firebase接続状態の確認とデバッグ
  useEffect(() => {
    console.log('=== Firebase デバッグ情報 ===');
    console.log('ユーザー状態:', user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerData: user.providerData
    } : 'ログインしていません');
    
    // Firebase設定の確認
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    
    console.log('Firebase設定状態:', {
      hasApiKey: !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE',
      hasAuthDomain: !!firebaseConfig.authDomain,
      hasProjectId: !!firebaseConfig.projectId,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
    });
    
    // Firebase初期化状態の確認
    import('../firebase').then(({ db, auth }) => {
      console.log('Firebase初期化状態:', {
        db: !!db,
        auth: !!auth,
        authCurrentUser: !!auth.currentUser,
      });
    });
    
    console.log('=== デバッグ情報終了 ===');
  }, [user]);

  // ユーザーのマップを自動読み込み
  useEffect(() => {
    const loadUserMap = async () => {
      if (!user) return;
      
      setIsLoadingMap(true);
      try {
        console.log('ユーザーマップの読み込み開始:', user.uid);
        
        // ユーザーの既存マップを取得
        const { getUserSelfAnalysisMaps } = await import('../services/selfAnalysisMapService');
        const userMaps = await getUserSelfAnalysisMaps(user.uid);
        
        if (userMaps.length > 0) {
          // 最新のマップを読み込み
          const latestMap = userMaps[0]; // getUserSelfAnalysisMapsは更新日順にソート済み
          console.log('既存マップを読み込み:', latestMap.id);
          
          setNodes(latestMap.nodes);
          setConnections(latestMap.connections);
          setSelfAnalysisResult(latestMap.analysisResult || null);
          setMapTitle(latestMap.title);
          setCurrentMapId(latestMap.id);
          
          const updatedAt = latestMap.updatedAt;
          if (updatedAt && typeof updatedAt === 'object' && 'seconds' in updatedAt) {
            setLastSaved(new Date(updatedAt.seconds * 1000));
          } else {
            setLastSaved(new Date(updatedAt));
          }
          
          console.log('マップ読み込み完了:', {
            nodesCount: Object.keys(latestMap.nodes).length,
            connectionsCount: latestMap.connections.length,
            hasAnalysisResult: !!latestMap.analysisResult
          });
        } else {
          console.log('既存マップなし - 新規マップとして開始');
        }
      } catch (error) {
        console.error('マップ読み込みエラー:', error);
        // エラーがあっても新規マップとして継続
      } finally {
        setIsLoadingMap(false);
      }
    };

    loadUserMap();
  }, [user]);

  // --- Unique ID Generation ---
  const generateId = () => `id-${self.crypto.randomUUID()}`;

  // --- Node Operations ---
  const addNode = (paletteItem: PaletteItem, x: number, y: number, customLabel?: string, customDetails?: Partial<NodeDetails>, isComplete?: boolean) => {
    const newNodeId = generateId();
    
    // undefinedの値を避けるためにデフォルト値を確実に設定
    const baseDetails = JSON.parse(JSON.stringify(paletteItem.defaultDetails)); // Deep copy
    const finalDetails: NodeDetails = { ...baseDetails };
    
    if (customDetails?.experience && paletteItem.type === 'experience') {
      finalDetails.experience = {
        ...baseDetails.experience,
        ...customDetails.experience
      };
    }
    
    if (customDetails?.trait && paletteItem.type === 'trait') {
      finalDetails.trait = {
        ...baseDetails.trait,
        ...customDetails.trait
      };
    }
    
    const newNode: Node = {
      id: newNodeId,
      label: customLabel || paletteItem.label,
      paletteItemId: paletteItem.id,
      x: Math.max(0, x - NODE_WIDTH / 2),
      y: Math.max(0, y - NODE_HEIGHT / 2),
      isComplete: isComplete || false,
      details: finalDetails
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

  // Auto-save effect (初回保存後のみ)
  useEffect(() => {
    if (!user || !currentMapId) return; // 初回保存前は自動保存しない
    
    const hasChanges = Object.keys(nodes).length > 0 || connections.length > 0;
    if (!hasChanges) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        console.log('自動保存実行中...');
        await saveSelfAnalysisMap(
          user.uid,
          mapTitle,
          nodes,
          connections,
          selfAnalysisResult || undefined,
          currentMapId
        );
        setLastSaved(new Date());
        console.log('自動保存完了');
      } catch (error) {
        console.error('自動保存エラー:', error);
      }
    }, 3000); // 3秒後に自動保存

    return () => clearTimeout(autoSaveTimer);
  }, [nodes, connections, selfAnalysisResult, user, currentMapId, mapTitle]);

  // --- Drag and Drop for Deletion ---
  const handleNodeDragStart = (e: React.DragEvent<HTMLDivElement>, nodeId: string) => {
    e.dataTransfer.setData('nodeId', nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrashDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTrash(true);
  };

  const handleTrashDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverTrash(false);
  };

  const handleTrashDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverTrash(false);
    const nodeId = e.dataTransfer.getData('nodeId');
    if (nodeId && confirm('このノードを削除しますか？')) {
      deleteNode(nodeId);
    }
  };


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

  // --- AI Functions ---
  const handleGenerateSelfAnalysis = async () => {
    if (!apiKeyIsSet) {
      alert("Gemini APIキーが設定されていません。この機能は利用できません。");
      return;
    }
    
    // ノード数のバリデーション
    const nodeCount = Object.keys(nodes).length;
    if (nodeCount < 2) {
      alert("自己分析を生成するには、少なくとも2つ以上のノードをマップに配置してください。");
      return;
    }
    
    // 完成したノードの数をチェック
    const completedNodes = Object.values(nodes).filter(node => node.isComplete).length;
    if (completedNodes < 1) {
      alert("自己分析を生成するには、少なくとも1つのノードを完成させてください。");
      return;
    }
    
    setIsLoadingAnalysis(true);
    
    try {
      // ノードデータを整理
      const nodesArray = Object.values(nodes).map(node => {
        const paletteItem = PALETTE_ITEMS.find(p => p.id === node.paletteItemId);
        let content: Record<string, string> = {};
        
        if (node.details.experience) {
          const exp = node.details.experience;
          content = exp.activeFramework === 'star' ? exp.star : exp.custom;
        } else if (node.details.trait) {
          content = { description: node.details.trait.description };
        }
        
        return {
          id: node.id,
          label: node.label,
          type: paletteItem?.type || 'experience',
          content,
          isComplete: node.isComplete
        };
      });
      
      const connectionsArray = connections.map(conn => ({
        fromNodeId: conn.fromNodeId,
        toNodeId: conn.toNodeId
      }));
      
      const result = await generateSelfAnalysis({
        nodes: nodesArray,
        connections: connectionsArray
      });
      
      setSelfAnalysisResult(result);
      setShowAnalysisResult(true);
      
      // フォールバック使用時の警告表示をチェック
      setTimeout(() => {
        if (console.warn.toString().includes('デフォルト値を使用しています')) {
          alert('注意: AI応答の解析に失敗したため、サンプル値を表示しています。マップにより詳細な情報を追加してから再試行してください。');
        }
      }, 100);
    } catch (error: any) {
      console.error("自己分析生成エラー:", error);
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // --- Save/Load Functions ---
  const handleSaveMap = async () => {
    console.log('=== 保存処理デバッグ開始 ===');
    
    // ユーザー認証状態の詳細確認
    console.log('ユーザー認証状態:', {
      user: !!user,
      userId: user?.uid,
      email: user?.email,
      isAnonymous: user?.isAnonymous,
      emailVerified: user?.emailVerified
    });

    if (!user) {
      console.error('❌ ユーザーがログインしていません');
      alert('マップを保存するにはログインが必要です。');
      return;
    }

    // Firebase認証トークンの確認
    try {
      const token = await user.getIdToken();
      console.log('Firebase認証トークン取得成功:', !!token);
    } catch (tokenError) {
      console.error('❌ Firebase認証トークン取得失敗:', tokenError);
      alert('認証トークンの取得に失敗しました。再ログインしてください。');
      return;
    }

    // データバリデーション
    const validationResults = {
      hasNodes: Object.keys(nodes).length > 0,
      hasTitle: mapTitle && mapTitle.trim() !== '',
      nodesCount: Object.keys(nodes).length,
      connectionsCount: connections.length
    };
    
    console.log('データバリデーション結果:', validationResults);

    if (!validationResults.hasNodes) {
      console.error('❌ 保存するノードがありません');
      alert('保存するノードがありません。マップにノードを追加してください。');
      return;
    }

    if (!validationResults.hasTitle) {
      console.error('❌ マップタイトルが空です');
      alert('マップタイトルを入力してください。');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('🚀 saveSelfAnalysisMap 呼び出し開始');
      console.log('保存パラメータ:', {
        userId: user.uid,
        mapTitle,
        nodesKeys: Object.keys(nodes),
        connectionsCount: connections.length,
        hasAnalysisResult: !!selfAnalysisResult,
        currentMapId: currentMapId || 'new'
      });

      const savedMapId = await saveSelfAnalysisMap(
        user.uid,
        mapTitle,
        nodes,
        connections,
        selfAnalysisResult || undefined,
        currentMapId || undefined
      );
      
      console.log('✅ 保存成功:', savedMapId);
      setCurrentMapId(savedMapId);
      setLastSaved(new Date());
      
      const message = currentMapId ? 'マップが更新されました！' : '新しいマップが保存されました！';
      alert(message);
      
    } catch (error: any) {
      console.error('❌ 保存エラー詳細:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name,
        fullError: error
      });
      
      // Firebaseエラーコードの詳細分析
      if (error.code) {
        switch (error.code) {
          case 'permission-denied':
            console.error('権限拒否エラー: Firestoreセキュリティルールが適切に設定されていません');
            alert('保存権限がありません。Firebaseセキュリティルールの設定を確認してください。\n\n詳細: FIREBASE_SECURITY_SETUP.md を参照');
            break;
          case 'unauthenticated':
            console.error('認証エラー: ユーザーが認証されていません');
            alert('認証エラーが発生しました。再ログインしてください。');
            break;
          case 'unavailable':
            console.error('サービス利用不可エラー: Firestoreサービスが利用できません');
            alert('Firestoreサービスが一時的に利用できません。しばらく待ってから再試行してください。');
            break;
          default:
            console.error('未知のFirebaseエラー:', error.code);
            alert(`Firebaseエラー [${error.code}]: ${error.message}`);
        }
      } else {
        console.error('非Firebaseエラー:', error);
        alert(`保存エラー: ${error.message}`);
      }
      
    } finally {
      setIsSaving(false);
      console.log('=== 保存処理デバッグ終了 ===');
    }
  };

  const handleLoadMap = async (mapId: string) => {
    try {
      const loadedMap = await loadSelfAnalysisMap(mapId);
      if (loadedMap) {
        setNodes(loadedMap.nodes);
        setConnections(loadedMap.connections);
        setSelfAnalysisResult(loadedMap.analysisResult || null);
        setMapTitle(loadedMap.title);
        setCurrentMapId(loadedMap.id);
        const updatedAt = loadedMap.updatedAt;
        if (updatedAt && typeof updatedAt === 'object' && 'seconds' in updatedAt) {
          setLastSaved(new Date(updatedAt.seconds * 1000));
        } else {
          setLastSaved(new Date(updatedAt));
        }
        alert('マップが読み込まれました！');
      }
    } catch (error: any) {
      console.error('読み込みエラー:', error);
      alert(`読み込みに失敗しました: ${error.message}`);
    }
  };

  // 新規作成機能を削除（一つのマップを継続使用）
  
  const handleGenerateDeepDiveQuestions = async (nodeId: string, experienceDetails: NodeDetails['experience']): Promise<string[] | null> => {
    if (!experienceDetails) return null;
    
    try {
      const node = nodes[nodeId];
      if (!node) return null;
      
      const framework = experienceDetails.activeFramework;
      const content = framework === 'star' ? experienceDetails.star : experienceDetails.custom;
      
      // 入力内容のバリデーション
      const filledFields = Object.values(content).filter(value => value && value.trim()).length;
      if (filledFields < 1) {
        alert("深掘り質問を生成するには、少なくとも1つのフィールドに内容を入力してください。");
        return null;
      }
      
      const questions = await generateDeepDiveQuestions({
        framework,
        content,
        label: node.label
      });
      
      return questions;
    } catch (error: any) {
      console.error("深掘り質問生成エラー:", error);
      alert(`深掘り質問の生成でエラーが発生しました: ${error.message}`);
      return null;
    }
  };

  const handleExtractTraits = async (nodeId: string, experienceDetails: NodeDetails['experience']): Promise<{ strengths: string[], weaknesses: string[] } | null> => {
    if (!experienceDetails) return null;
    
    try {
      const node = nodes[nodeId];
      if (!node) return null;
      
      const framework = experienceDetails.activeFramework;
      const content = framework === 'star' ? experienceDetails.star : experienceDetails.custom;
      
      // 入力内容のバリデーション
      const filledFields = Object.values(content).filter(value => value && value.trim()).length;
      if (filledFields < 2) {
        alert("特性を抽出するには、少なくとも2つ以上のフィールドに内容を入力してください。");
        return null;
      }
      
      const traits = await extractTraitsFromExperience({
        framework,
        content,
        label: node.label
      });
      
      return traits;
    } catch (error: any) {
      console.error("特性抽出エラー:", error);
      alert(`特性抽出でエラーが発生しました: ${error.message}`);
      return null;
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-blue-600">{APP_NAME} - 自己分析マップ</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">{mapTitle}</span>
            {lastSaved && (
              <span className="text-xs">
                保存日時: {lastSaved.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isLoadingMap && (
            <div className="text-sm text-gray-600 flex items-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2">マップを読み込み中...</span>
            </div>
          )}
          <Button
            onClick={handleSaveMap}
            isLoading={isSaving}
            variant="secondary"
            size="sm"
            disabled={!user || isSaving || Object.keys(nodes).length === 0}
            title={
              !user ? "保存するにはログインが必要です" :
              Object.keys(nodes).length === 0 ? "保存するノードがありません" :
              "マップを保存"
            }
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
          <Button
            onClick={handleGenerateSelfAnalysis}
            isLoading={isLoadingAnalysis}
            leftIcon={<SparklesIcon className="w-5 h-5"/>}
            disabled={!apiKeyIsSet || isLoadingAnalysis}
            title={!apiKeyIsSet ? "Gemini APIキーが設定されていません。" : "AIで自己分析項目を洗い出し"}
          >
            自己分析を実行
          </Button>
          {selfAnalysisResult && (
            <Button
              onClick={() => setShowAnalysisResult(!showAnalysisResult)}
              variant="secondary"
              leftIcon={<DocumentTextIcon className="w-5 h-5"/>}
            >
              {showAnalysisResult ? '結果を閉じる' : '分析結果を表示'}
            </Button>
          )}
        </div>
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
           {/* Trash Area */}
           <div className="pt-4 border-t mt-4">
             <h3 className="text-sm font-semibold text-gray-700 mb-2">削除エリア</h3>
             <div
               className={`p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
                 dragOverTrash
                   ? 'border-red-500 bg-red-50 text-red-700'
                   : 'border-gray-300 bg-gray-50 text-gray-500'
               }`}
               onDragOver={handleTrashDragOver}
               onDragLeave={handleTrashDragLeave}
               onDrop={handleTrashDrop}
             >
               <TrashIcon className="w-8 h-8 mx-auto mb-2" />
               <p className="text-xs">
                 {dragOverTrash ? 'ここにドロップして削除' : 'ノードをここにドラッグして削除'}
               </p>
             </div>
           </div>

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
              onMouseUpOnNode={handleConnectorMouseUpOnNode}
              onDragStart={handleNodeDragStart}
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

      {/* Self Analysis Result Panel */}
      {selfAnalysisResult && showAnalysisResult && (
        <Card title="自己分析結果" className="m-2 sticky bottom-0 z-20 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="font-semibold text-blue-700 text-sm mb-2">💪 強み</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.strengths.map((item, i) => (
                  <li key={i} className="p-1 bg-blue-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-orange-700 text-sm mb-2">📈 改善点</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.weaknesses.map((item, i) => (
                  <li key={i} className="p-1 bg-orange-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-green-700 text-sm mb-2">💎 価値観</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.values.map((item, i) => (
                  <li key={i} className="p-1 bg-green-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-purple-700 text-sm mb-2">🎭 性格特性</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.personalityTraits.map((item, i) => (
                  <li key={i} className="p-1 bg-purple-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-indigo-700 text-sm mb-2">🛠️ スキル</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.skills.map((item, i) => (
                  <li key={i} className="p-1 bg-indigo-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-teal-700 text-sm mb-2">📚 主要経験</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.experiences.map((item, i) => (
                  <li key={i} className="p-1 bg-teal-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-pink-700 text-sm mb-2">🌱 成長領域</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.growthAreas.map((item, i) => (
                  <li key={i} className="p-1 bg-pink-50 rounded">{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-amber-700 text-sm mb-2">🎯 キャリア志向</h4>
              <ul className="text-xs space-y-1">
                {selfAnalysisResult.careerGoals.map((item, i) => (
                  <li key={i} className="p-1 bg-amber-50 rounded">{item}</li>
                ))}
              </ul>
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
          onGenerateDeepDiveQuestions={handleGenerateDeepDiveQuestions}
          onExtractTraits={handleExtractTraits}
          apiKeyIsSet={apiKeyIsSet} // Pass API key status
        />
      )}
    </div>
  );
};

export default SelfAnalysisScreen;
