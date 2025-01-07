'use client';

import { Bell, Brain, Home, Settings, Upload, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TemplateRenderer from '@/app/components/TemplateRenderer';
import { TemplateSchema } from '@/app/type/template';

export default function Main() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateSchema | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isShowReport, setIsShowReport] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState('Ironmind thinking...');
  const reportDatas = {
    UploadFile: '',
    TemplatePath: 'http://localhost:3001/01.json',
  };

  // 处理按钮点击事件
  const handleButtonClick = (index: number) => {
    if (index === 0) {
      // 触发文件上传
      fileInputRef.current?.click();
    }
    // 其他按钮的处理逻辑...
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token not found! Please get a token first.');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/report-generation/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      reportDatas.UploadFile = result.UploadFile;
      console.log('Upload successful:', result);
      setIsShowReport(true);
      setLoading(true);
      await generatReport();
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload file. Please try again.');
    } finally {
      // 清除文件输入，允许重新上传相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  //加载文本
  useEffect(() => {
    if (loading) {
      const txts = [
        'Ironmind Thinking...',
        'Ironmind Analyzing...',
        'Ironmind Generating...',
        'Ironmind Writing...',
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(txts[i]);
        i = (i + 1) % txts.length;
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const generatReport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token not found! Please get a token first.');
        return;
      }

      //加载模版
      const templateResponse = await fetch(reportDatas.TemplatePath);
      if (!templateResponse.ok) throw new Error('Failed to fetch template');
      const templateData = await templateResponse.json();
      //加载数据
      let tplUrl = reportDatas.TemplatePath.replace(
        'http://localhost:3001',
        'http://frontend:3001',
      );
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/report-generation/generate?UploadFile=${encodeURIComponent(reportDatas.UploadFile)}&TemplatePath=${encodeURIComponent(tplUrl)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('Report generated:', result);
      setLoading(false);
      //写入
      setTemplate(templateData);
      setReportData(result.Report);
    } catch (error) {
      console.error('Report generation error:', error);
      setError('Failed to generate report. Please try again.');
    }
  };

  const changeTemplate = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    reportData.TemplatePath = event.target.value;
    await generatReport();
  };

  const buttons = [
    { text: 'upload transcript', icon: Upload },
    /*{ text: 'record voice', icon: Mic }*/
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.doc,.docx,.pdf"
      />

      <nav className="bg-white shadow-md px-4 py-3 fixed top-0 w-full z-10">
        {error && (
          <div className="fixed top-0 left-0 w-full h-[5%] bg-red-500 text-white p-2 flex items-center justify-center">
            {error}
          </div>
        )}
        {/* 导航栏内容保持不变 */}
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">Ironmind.ai</h1>
          </div>

          <div className="flex items-center space-x-6">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Home className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <User className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 mt-16 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {buttons.map((button, index) => {
              const Icon = button.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleButtonClick(index)}
                  className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow
                           flex flex-col items-center justify-center space-y-2
                           border border-gray-200"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{button.text}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* 增加一个生成展示报告的区域 */}
        {isShowReport ? (
          <div className="w-4/5 mx-auto my-10 p-6 bg-white rounded-lg shadow-lg">
            <div className="flex justify-end">
              <select
                className="p-2 border border-gray-300 rounded-md"
                defaultValue="01"
                onChange={changeTemplate}
              >
                <option value="http://localhost:3001/01.json1">
                  Template1
                </option>
                <option value="http://localhost:3001/01.json">Template2</option>
              </select>
            </div>
            <div className="flex flex-col items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <Brain className="text-blue-600 w-12 h-12" />
                  <span className="text-gray-700 mt-2" id="LoadingText">
                    {loadingText}
                  </span>
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce animation-delay-200"></div>
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce animation-delay-400"></div>
                  </div>
                </div>
              ) : (
                <div className="animate__animated animate__fadeIn">
                  <TemplateRenderer
                    template={template?.properties || {}}
                    data={reportData}
                    onUpdate={async (path: string[], newValue: any) => {
                      // Implement the onUpdate function logic here
                      console.log('Update path:', path, 'New value:', newValue);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="bg-white shadow-md mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex justify-center text-gray-500">
            © 2024 Ironmind.ai All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
