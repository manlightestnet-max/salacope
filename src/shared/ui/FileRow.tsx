import React from 'react';
import clsx from 'clsx';
import { File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  zip: FileArchive,
  rar: FileArchive,
  mp4: FileVideo,
  mov: FileVideo,
  mkv: FileVideo,
  mp3: FileAudio,
  wav: FileAudio,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  webp: FileImage,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  pdf: FileText,
  epub: FileText,
  doc: FileText,
  docx: FileText,
  pptx: FileText,
  txt: FileText,
};

/** The icon that tells what a file is, from its name. */
export const fileIcon = (name: string): LucideIcon => ICONS[(name.split('.').pop() ?? '').toLowerCase()] ?? File;

/**
 * One file in a list, the same everywhere a file shows (the seller's editor, the offer page, the buyer's purchase): a tile with
 * the kind of file, its name and a short line under it, and whatever the screen needs on the right (download, remove…).
 * `below` is a full-width line under the row (a switch, a progress bar, an error).
 */
export const FileRow: React.FC<{
  name: string;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  below?: React.ReactNode;
  className?: string;
}> = ({ name, meta, trailing, below, className }) => {
  const Icon = fileIcon(name);
  return (
    <div className={clsx('rounded-2xl border border-gray-200 bg-surface px-3 py-2.5', className)}>
      <div className="flex items-center gap-3 min-h-[2.75rem]">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          {meta && <p className="text-xs text-gray-500 truncate tabular-nums">{meta}</p>}
        </div>
        {trailing && <div className="shrink-0 flex items-center gap-1">{trailing}</div>}
      </div>
      {below && <div className="mt-2.5">{below}</div>}
    </div>
  );
};
