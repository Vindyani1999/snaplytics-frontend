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
      <div className="space-y-4">
        <div className="text-sm text-slate-500">
          No rows found. Select a timestamp group from the sidebar to view data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto border rounded p-2 max-h-[60vh]">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr>
              {displayFields.map((field) => (
                <th key={field} className="px-2 py-1 font-medium border-b">
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                {displayFields.map((field) => (
                  <td key={field} className="px-2 py-1">
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
