
import React from 'react';
import { TimelineStep } from '../types';
import { CheckCircleIcon, ClockIcon, PlayCircleIcon } from '@heroicons/react/24/solid';
import Card from './Card'; // Added import for Card

interface TimelineItemProps {
  step: TimelineStep;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ step, isLast = false }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'in-progress':
        return <PlayCircleIcon className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case 'pending':
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
     switch (step.status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'in-progress':
        return 'border-yellow-500 bg-yellow-50';
      case 'pending':
      default:
        return 'border-gray-300 bg-gray-50';
    }
  }

  return (
    <li className="mb-6 ms-8"> {/* Adjusted margin for icon */}
      <span className={`absolute flex items-center justify-center w-10 h-10 rounded-full -start-5 ring-4 ring-white ${getStatusColor()}`}>
        {getStatusIcon()}
      </span>
      {!isLast && (
         <div className={`absolute w-0.5 h-full bg-gray-300 -start-[1.125rem] top-10 ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
      )}
      <Card className={`ml-4 ${getStatusColor()}`}>
        <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
        {step.dueDate && (
          <time className="block mb-2 text-sm font-normal leading-none text-gray-500">
            期限: {step.dueDate.toLocaleDateString()}
          </time>
        )}
        <p className="text-base font-normal text-gray-600">{step.description}</p>
      </Card>
    </li>
  );
};

export default TimelineItem;
