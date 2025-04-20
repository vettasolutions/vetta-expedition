'use client';
import { useState } from 'react';
import { QUERY_TEMPLATES } from '@/utils/query-templates';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isDisabled: boolean;
  userType: string;
}

export default function QueryInput({
  onSubmit,
  isDisabled,
  userType,
}: QueryInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmit(query);
    }
  };

  // Generate example queries based on user type and templates
  const exampleQueries = Object.entries(
    QUERY_TEMPLATES[userType] || {},
  ).flatMap(([_, template]) => template.examples.slice(0, 1)); // Just take first example from each template

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center border-b border-gray-300 py-2">
          <input
            className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
            type="text"
            placeholder="Ask a question about your data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isDisabled}
            aria-label="Query input"
          />
          <button
            className="flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded"
            type="submit"
            disabled={isDisabled || !query.trim()}
          >
            Submit
          </button>
        </div>
      </form>

      <div className="mt-4">
        <p className="text-sm text-gray-600 mb-2">
          Example queries for {userType.replace('_', ' ')}:
        </p>
        <div className="flex flex-wrap gap-2">
          {exampleQueries.map((exampleQuery, index) => (
            <button
              key={index}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs py-1 px-2 rounded"
              onClick={() => setQuery(exampleQuery)}
              disabled={isDisabled}
              type="button"
            >
              {exampleQuery}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
