'use client';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ResultsDisplayProps {
  results: any[];
  meta?: {
    queryType: string;
    description: string;
    paramValues: any[];
    confidence?: number;
    reasoning?: string;
  };
}

export default function ResultsDisplay({ results, meta }: ResultsDisplayProps) {
  const [displayMode, setDisplayMode] = useState<'table' | 'chart'>('table');

  if (!results || results.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center py-8">
        <p>No results found for this query.</p>
        {meta && (
          <div className="mt-2 text-sm text-gray-500">
            <p>Query type: {meta.description}</p>
          </div>
        )}
      </div>
    );
  }

  // Extract column names from first result
  const columns = Object.keys(results[0]);

  // Determine if chart is applicable
  const hasNumericValues = columns.some(
    (column) =>
      typeof results[0][column] === 'number' &&
      column !== 'id' &&
      column !== 'family_id',
  );

  // Find a suitable numeric column for the chart
  const numericColumn = columns.find(
    (column) =>
      typeof results[0][column] === 'number' &&
      column !== 'id' &&
      column !== 'family_id',
  );

  // Find a suitable label column
  const labelColumn =
    columns.find(
      (column) =>
        typeof results[0][column] === 'string' ||
        column === 'family_id' ||
        column === 'id' ||
        column.includes('name') ||
        column.includes('identifier'),
    ) || columns[0];

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Results</h2>
        {hasNumericValues && (
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 rounded ${displayMode === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setDisplayMode('table')}
              type="button"
            >
              Table
            </button>
            <button
              className={`px-3 py-1 rounded ${displayMode === 'chart' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setDisplayMode('chart')}
              type="button"
            >
              Chart
            </button>
          </div>
        )}
      </div>

      {meta && (
        <div className="mb-4 p-2 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Query:</span> {meta.description}
          </p>
          {meta.confidence && (
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Confidence:</span>{' '}
              {meta.confidence}%
            </p>
          )}
          {meta.reasoning && (
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Reasoning:</span> {meta.reasoning}
            </p>
          )}
        </div>
      )}

      {displayMode === 'table' || !hasNumericValues ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {Array.isArray(row[column])
                        ? row[column].join(', ')
                        : row[column] !== null
                          ? String(row[column])
                          : 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={results}
              margin={{
                top: 20,
                right: 30,
                left: 40,
                bottom: 50,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={labelColumn}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey={numericColumn || columns[1]}
                fill="#3b82f6"
                name={numericColumn?.replace(/_/g, ' ') || 'Value'}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
        <p>{results.length} results found</p>
        <p className="text-xs">
          {meta?.queryType && `Query executed: ${meta.queryType}`}
        </p>
      </div>
    </div>
  );
}
