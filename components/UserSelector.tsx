'use client';
import { useState } from 'react';

interface UserSelectorProps {
  currentUserType: string;
  onUserTypeChange: (userType: string) => void;
}

export default function UserSelector({
  currentUserType,
  onUserTypeChange,
}: UserSelectorProps) {
  const userTypes = [
    { id: 'mentor', name: 'Mentor / Social Worker' },
    { id: 'organization_head', name: 'Organization Head' },
    { id: 'psp_head', name: 'PSP Head / Data Team' },
  ];

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        User Role:
      </label>
      <div className="flex flex-wrap gap-2">
        {userTypes.map((type) => (
          <button
            key={type.id}
            className={`px-4 py-2 rounded-lg ${
              currentUserType === type.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => onUserTypeChange(type.id)}
          >
            {type.name}
          </button>
        ))}
      </div>
    </div>
  );
}
