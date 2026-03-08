import React from 'react';
import { Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#333] bg-black sticky top-0 z-10">
      <h1 className="text-sm font-medium text-white">{title}</h1>

      <div className="flex items-center gap-2">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#111] text-[#888] hover:text-white transition-colors">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full" />
        </button>
        <div className="w-7 h-7 rounded-full bg-[#333] border border-[#444] flex items-center justify-center">
          <span className="text-[10px] font-medium text-white">U</span>
        </div>
      </div>
    </header>
  );
}
