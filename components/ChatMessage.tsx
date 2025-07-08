
import React from 'react';
import { ChatMessage as ChatMessageType, GroundingChunkWeb } from '../types';
import { UserCircleIcon, SparklesIcon, LinkIcon } from '@heroicons/react/24/solid';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start max-w-xl ${isUser ? 'flex-row-reverse' : ''}`}>
        {isUser ? (
          <UserCircleIcon className="w-8 h-8 rounded-full text-blue-500 ml-2 flex-shrink-0" />
        ) : (
          <SparklesIcon className="w-8 h-8 rounded-full text-indigo-500 mr-2 flex-shrink-0" />
        )}
        <div
          className={`px-4 py-3 rounded-xl shadow-md ${
            message.isError
              ? 'bg-red-100 text-red-700 border border-red-200 rounded-bl-none'
              : isUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none'
          }`}
        >
          <p className={`text-sm whitespace-pre-wrap ${message.isError ? 'font-semibold' : ''}`}>{message.text}</p>
          {message.metadata?.groundingChunks && message.metadata.groundingChunks.length > 0 && (
             <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <h4 className="text-xs font-semibold mb-1 ${isUser ? 'text-blue-100' : 'text-gray-600'}">参照元:</h4>
              <ul className="space-y-1">
                {message.metadata.groundingChunks.map((chunk: { web?: GroundingChunkWeb }, index: number) => (
                  chunk.web && (
                    <li key={index} className="text-xs">
                      <a
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center hover:underline ${isUser ? 'text-blue-200 hover:text-blue-100' : 'text-indigo-600 hover:text-indigo-400'}`}
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        {chunk.web.title || chunk.web.uri}
                      </a>
                    </li>
                  )
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
