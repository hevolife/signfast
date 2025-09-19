import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { FormField } from '../../types/form';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MaskedInput } from './MaskedInput';
import { Trash2, GripVertical } from 'lucide-react';

interface FormFieldEditorProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  isMultiSelected: boolean;
  isMultiSelectMode: boolean;
  onClick: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

export const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  index,
  isSelected,
  isMultiSelected,
  isMultiSelectMode,
  onClick,
  onUpdate,
  onRemove,
  onMove,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'form-field',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'form-field',
    item: () => {
      return { id: field.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  // Déterminer la classe de bordure selon l'état de sélection
  const getBorderClass = () => {
    if (isMultiSelectMode && isMultiSelected) {
      return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300';
    } else if (isSelected && !isMultiSelectMode) {
      return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    } else {
      return 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
    }
  };
  const renderFieldInput = () => {
    switch (field.type) {
      case 'text':
        return field.validation?.mask ? (
          <MaskedInput
            mask={field.validation.mask}
            value=""
            onChange={() => {}}
            placeholder={field.placeholder || field.label}
          />
        ) : (
          <Input
            type="text"
            placeholder={field.placeholder || field.label}
            disabled
          />
        );
      case 'email':
      case 'phone':
      case 'number':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder || field.label}
            disabled
          />
        );
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder || field.label}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            rows={3}
            disabled
          />
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input type="radio" name={field.id} disabled />
                <span className="text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input type="checkbox" disabled />
                <span className="text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'date':
      case 'birthdate':
        return <Input type="date" disabled />;
      case 'file':
        return <Input type="file" disabled />;
        return (
          <div className="space-y-2">
            <Input 
              type="file" 
              accept={field.validation?.acceptedFileTypes?.join(',') || "image/*,.pdf,.doc,.docx"}
              disabled 
            />
            {field.validation?.acceptedFileTypes && (
              <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                Types: {field.validation.acceptedFileTypes.join(', ')}
                {field.validation.maxFileSize && ` • Max: ${field.validation.maxFileSize}MB`}
              </div>
            )}
          </div>
        );
      case 'signature':
        return (
          <div className="w-full">
            <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400">Zone de signature (aperçu)</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`p-3 lg:p-4 border-2 rounded-lg cursor-pointer transition-all touch-manipulation ${getBorderClass()} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <div className="flex items-center space-x-2">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move touch-none" />
          {isMultiSelectMode && (
            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
              isMultiSelected 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}>
              {isMultiSelected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 min-h-[44px] min-w-[44px] lg:min-h-auto lg:min-w-auto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {renderFieldInput()}
    </div>
  );
};