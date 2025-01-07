'use client';

import React, { useState, useCallback } from 'react';
import { TemplateField } from '@/app/type/template';
import { Pencil, X, Sparkles } from "lucide-react";

interface TemplateRendererProps {
  template: { [key: string]: TemplateField };
  data: any;
  onUpdate: (path: string[], newValue: any) => Promise<void>;
}

interface EditState {
  path: string[];
  value: any;
  prompts: string;
}

const TemplateRenderer: React.FC<TemplateRendererProps> = ({template, data: initialData,  onUpdate }) => {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 添加本地数据状态
  const [data, setData] = useState(initialData);

  const handleEdit = async (path: string[], value: any) => {
    setEditState({ path, value, prompts: '' });
  };

  const handleCancel = () => {
    setEditState(null);
  };

  const handleSave = async () => {
    if (!editState) return;
    // 添加 prompts 验证
    if (!editState.prompts.trim()) {
      setError('Please enter prompts for regeneration');
      return;
    }
    try {
      setLoading(true);
      //服务器请求
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token not found! Please get a token first.');
        return;
      }
      // 确保同时发送 prompts 和原始文本
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/report-generation/reGernatePart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompts: editState.prompts,
          oldSection: editState.value
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update content');
      }
      console.log('update successful:', response);
      const newContents = await response.json()
      const newContent = newContents.output;
      console.log('newContent successful:', newContent);
      // 更新编辑状态中的值
      const updatedEditState = { ...editState, value: newContent };
      
      await onUpdate(editState.path, newContent);
      // 更新本地数据
      setData((prevData: any) => {
        const newData = { ...prevData };
        let current = newData;
        
        for (let i = 0; i < editState.path.length - 1; i++) {
          const key = editState.path[i];
          if (key === 'items') {
            if (!Array.isArray(current.items)) {
              current.items = [];
            }
            current = current.items;
          } else {
            if (!(key in current)) {
              current[key] = {};
            }
            current = current[key];
          }
        }
        
        const lastKey = editState.path[editState.path.length - 1];
        current[lastKey] = newContent;
        
        return newData;
      });
      
      setEditState(null);
      setError(null);
    } catch (error) {
      console.error('Failed to update:', error);
      setError(error instanceof Error ? error.message : 'Failed to update content');
    } finally {
      setLoading(false);
    }
  };

  const renderEditableContent = (
    value: string,
    path: string[],
    isMultiline: boolean = false
  ) => {
    const isEditing = editState?.path.join('.') === path.join('.');
    
    if (isEditing) {
      return (
        <div className="space-y-4 w-full">
          {/* 原始内容显示 */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Original Content:</h4>
            <div className="text-gray-600 whitespace-pre-wrap">{value}</div>
          </div>
          
          {/* Prompts 输入框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter prompts for regeneration:
            </label>
            <textarea
              value={editState.prompts}
              onChange={(e) => setEditState({ ...editState, prompts: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 min-h-[80px]"
              placeholder="Enter your prompts here..."
            />
          </div>
          
          {/* 错误信息显示 */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          {/* 按钮组 */}
          <div className="flex space-x-2">
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
            <button
              className={`${
                loading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
              } text-white px-4 py-2 rounded-md flex items-center flex-1 justify-center`}
              onClick={handleSave}
              disabled={loading || !editState.prompts.trim()}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      );
    }
  
    return (
      <div className="group relative">
        <div className="text-gray-700 whitespace-pre-wrap">{value}</div>
        <button
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleEdit(path, value)}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const renderField = (field: TemplateField, fieldData: any, fieldName: string, path: string[] = []) => {
    switch (field.type) {
      case 'string':
        return renderStringField(fieldName, fieldData, field.description, [...path, fieldName]);
      case 'object':
        if (field.properties?.items) {
          return renderArrayField(fieldName, fieldData, field.properties.items, [...path, fieldName]);
        }
        return renderObjectField(fieldName, fieldData, field.properties || {}, [...path, fieldName]);
      default:
        return null;
    }
  };

  const renderStringField = (name: string, value: string, description?: string, path: string[] = []) => (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {formatFieldName(name)}
      </h3>
      {renderEditableContent(value, path, value.length > 100)}
    </div>
  );

  const renderObjectField = (name: string, data: any, properties: { [key: string]: TemplateField }, path: string[] = []) => {
    if (!data) return null;

    return (
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {formatFieldName(name)}
        </h3>
        <div className="space-y-4">
          {Object.entries(properties).map(([key, field]) => (
            <div key={key}>
              {renderField(field, data[key], key, [...path, key])}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderArrayField = (name: string, data: any, itemTemplate: any, path: string[] = []) => {
    if (!data?.items || !Array.isArray(data.items)) return null;

    return (
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {formatFieldName(name)}
        </h3>
        <div className="space-y-4">
          {data.items.map((item: any, index: number) => {
            const itemPath = [...path, 'items', index.toString()];
            
            if (item.name && item.description) {
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4 group relative">
                  <h4 className="font-medium text-gray-800 mb-2">
                    {renderEditableContent(item.name, [...itemPath, 'name'])}
                  </h4>
                  {renderEditableContent(item.description, [...itemPath, 'description'], true)}
                </div>
              );
            }

            if (item.Name && item.Activity && item.Goal) {
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">
                    {renderEditableContent(item.Name, [...itemPath, 'Name'])}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Activity: </span>
                      {renderEditableContent(item.Activity, [...itemPath, 'Activity'])}
                    </div>
                    <div>
                      <span className="font-medium">Goal: </span>
                      {renderEditableContent(item.Goal, [...itemPath, 'Goal'])}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                {Object.entries(item).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <span className="font-medium text-gray-700">
                      {formatFieldName(key)}:{' '}
                    </span>
                    {renderEditableContent(value as string, [...itemPath, key])}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const formatFieldName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {Object.entries(template).map(([key, field]) => (
          <React.Fragment key={key}>
            {renderField(field, data[key], key)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TemplateRenderer;