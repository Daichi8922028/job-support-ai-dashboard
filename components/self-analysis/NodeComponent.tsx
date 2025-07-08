import React from 'react';
import { Node, PaletteItem, ConnectorPoint } from '../../types';
import { PALETTE_ITEMS, NODE_WIDTH, NODE_HEIGHT, CONNECTOR_SIZE } from '../../constants';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface NodeComponentProps {
  node: Node;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onDoubleClick: (nodeId: string) => void;
  onConnectorMouseDown: (
    e: React.MouseEvent<HTMLDivElement>,
    nodeId: string,
    connectorSide: 'top' | 'bottom' | 'left' | 'right'
  ) => void;
  isSelected?: boolean;
  onMouseUpOnNode: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void; // Added prop
}

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  onMouseDown,
  onDoubleClick,
  onConnectorMouseDown,
  isSelected,
  onMouseUpOnNode, // Destructure the new prop
}) => {
  const paletteItem = PALETTE_ITEMS.find(p => p.id === node.paletteItemId);
  if (!paletteItem) return null;

  const Icon = paletteItem.icon;

  const connectorPositions = {
    top: { top: `-${CONNECTOR_SIZE / 2}px`, left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: `-${CONNECTOR_SIZE / 2}px`, left: '50%', transform: 'translateX(-50%)' },
    left: { left: `-${CONNECTOR_SIZE / 2}px`, top: '50%', transform: 'translateY(-50%)' },
    right: { right: `-${CONNECTOR_SIZE / 2}px`, top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <div
      id={node.id}
      className={`absolute p-3 rounded-lg shadow-md cursor-grab ${paletteItem.color} border-2 ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500 shadow-xl' : 'hover:shadow-lg'}`}
      style={{
        left: node.x,
        top: node.y,
        width: `${NODE_WIDTH}px`,
        height: `${NODE_HEIGHT}px`,
        touchAction: 'none', // For pointer events
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onMouseUp={(e) => onMouseUpOnNode(e, node.id)} // Attached onMouseUp event
      onDoubleClick={() => onDoubleClick(node.id)}
      role="button"
      tabIndex={0}
      aria-label={`Node ${node.label}`}
    >
      <div className="flex items-center space-x-2 mb-1">
        <Icon className="w-5 h-5 text-gray-700" />
        <span className="text-sm font-semibold text-gray-800 truncate" title={node.label}>
          {node.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 truncate">{paletteItem.type === 'experience' ? '経験' : '特性'}</p>
      {node.isComplete && (
        <CheckCircleIcon className="w-5 h-5 text-green-500 absolute top-1 right-1" title="完了" />
      )}

      {/* Connector points */}
      {(['top', 'bottom', 'left', 'right'] as const).map(side => (
        <div
          key={side}
          className="absolute bg-gray-400 hover:bg-blue-500 rounded-full cursor-crosshair"
          style={{
            width: `${CONNECTOR_SIZE}px`,
            height: `${CONNECTOR_SIZE}px`,
            ...connectorPositions[side],
          }}
          onMouseDown={(e) => {
            e.stopPropagation(); // Prevent node drag
            onConnectorMouseDown(e, node.id, side);
          }}
          title={`Connect from ${side}`}
        />
      ))}
    </div>
  );
};

export default NodeComponent;