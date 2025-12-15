'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const [inputValue, setInputValue] = useState<string>('');
  const [token, setToken] = useState<string | null>(() => {
    // 初始化时从 localStorage 获取 token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 如果已经有 token，直接跳转到 main 页面
  useEffect(() => {
    if (token) {
      router.push('/main');
    }
  }, [token, router]);

  const handleGetToken = async () => {
    try {
      //判断输入框输入
      if (!inputValue) {
        setError('Please enter your ID.');
        return;
      }
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/token?id=${inputValue}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (data.access_token) {
        // 存储 token 到 localStorage
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        router.push('/main');
      } else {
        setError('Token not received');
        throw new Error('Token not received');
      }
    } catch (error) {
      console.error('Failed to get token:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[50px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] m-0 w-full">
      {error && (
        <div className="fixed top-0 left-0 w-full h-[5%] bg-red-500 text-white p-2 flex items-center justify-center">
          {error}
        </div>
      )}

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold">LangGraph Report Generator</h1>
        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-center text-sm font-[family-name:var(--font-geist-mono)]">
            Click the button below to start.
          </p>
          <input
            type="text"
            placeholder="Enter your ID"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="border-solid"
          />
          <button
            onClick={handleGetToken}
            disabled={loading}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-8 sm:px-10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Start'}
          </button>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/langchain-ai/langgraph"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          LangGraph
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          GitHub →
        </a>
      </footer>
    </div>
  );
}
