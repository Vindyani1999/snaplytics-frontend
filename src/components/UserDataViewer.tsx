"use client";

import React, { useMemo } from "react";

interface UserDataViewerProps {
  data: any[];
  fields: string[];
}

export default function UserDataViewer({ data, fields }: UserDataViewerProps) {
  // Get unique fields from the data if not provided
  const displayFields = useMemo(() => {
    if (fields && fields.length > 0) {
      return fields;
    }
    if (!data || data.length === 0) return [];

    const fieldSet = new Set<string>();
    data.forEach((row) => {
      Object.keys(row).forEach((key) => fieldSet.add(key));
    });
    return Array.from(fieldSet);
  }, [data, fields]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg
          className="w-16 h-16 text-slate-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <div className="text-sm text-slate-500 text-center max-w-xs">
          <p className="font-semibold mb-1">No data available</p>
          <p className="text-xs">
            Select a timestamp group from the sidebar to view and analyze data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto border border-slate-200 rounded-lg shadow-sm max-h-[60vh]">
        <table className="min-w-full text-left text-sm divide-y divide-slate-200">
          <thead className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm">
            <tr>
              {displayFields.map((field) => (
                <th
                  key={field}
                  className="px-4 py-3 font-bold text-xs text-slate-700 uppercase tracking-wider whitespace-nowrap"
                >
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr
                key={i}
                className={`
                    transition-colors duration-150
                    ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                    hover:bg-indigo-50 hover:shadow-sm
                  `}
              >
                {displayFields.map((field) => (
                  <td
                    key={field}
                    className="px-4 py-3 text-slate-700 whitespace-nowrap"
                  >
                    {row[field] !== undefined && row[field] !== null
                      ? String(row[field])
                      : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
