'use client';
import { useState } from 'react';
import UserSelector from '@/components/UserSelector';
import QueryInput from '@/components/QueryInput';
import ResultsDisplay from '@/components/ResultsDisplay';

export default function PovertyStoplightPage() {
  const [userType, setUserType] = useState('mentor');
  const [results, setResults] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  // For POC, hardcode organization ID
  const organizationId = 1;
  const userId = 1;

  const handleQuery = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setLastQuery(query);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userType,
          organizationId,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      setResults(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message);
      setResults(null);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Poverty Stoplight MCP POC
          </h1>
          <p className="text-gray-600 mb-4">
            This proof-of-concept demonstrates the Managed Code Platform
            architecture for querying Poverty Stoplight data with natural
            language.
          </p>

          <UserSelector
            currentUserType={userType}
            onUserTypeChange={setUserType}
          />

          <div className="mt-6">
            <QueryInput
              onSubmit={handleQuery}
              isDisabled={isLoading}
              userType={userType}
            />
          </div>
        </div>

        {isLoading && (
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-8 w-8 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
              <p>Processing your query...</p>
              {lastQuery && (
                <p className="text-sm text-gray-500 mt-2">"{lastQuery}"</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
            {lastQuery && (
              <p className="text-sm text-red-500 mt-2">Query: "{lastQuery}"</p>
            )}
          </div>
        )}

        {results && <ResultsDisplay results={results} meta={meta} />}
      </div>
    </main>
  );
}
