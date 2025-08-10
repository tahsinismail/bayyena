import React, { useEffect, useState } from 'react';
import { Card, Text, Flex, Button } from '@radix-ui/themes';
import { CheckIcon, Cross1Icon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckIcon className="text-green-600" />;
      case 'error':
        return <Cross1Icon className="text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="text-yellow-600" />;
      case 'info':
        return <InfoCircledIcon className="text-blue-600" />;
      default:
        return <InfoCircledIcon className="text-blue-600" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'warning':
        return 'yellow';
      case 'info':
        return 'blue';
      default:
        return 'blue';
    }
  };

  if (!isVisible) return null;

  return (
    <Card 
      className={`p-4 mb-3 border-l-4 border-l-${getColor()}-500 bg-white shadow-lg transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ minWidth: '300px', maxWidth: '400px' }}
    >
      <Flex align="start" gap="3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <Text size="2" weight="bold" className={`text-${getColor()}-800`}>
            {title}
          </Text>
          <Text size="2" color="gray" className="mt-1 block">
            {message}
          </Text>
        </div>
        <Button
          variant="ghost"
          size="1"
          onClick={() => onClose(id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <Cross1Icon />
        </Button>
      </Flex>
    </Card>
  );
};

export default Toast;
