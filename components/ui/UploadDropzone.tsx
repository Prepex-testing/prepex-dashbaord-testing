"use client";

import { useId, useState } from "react";
import type { ChangeEvent, DragEvent, MouseEvent } from "react";
import { XIcon, FileIcon } from "@/components/ui/icons";
import { UploadIcon } from "@/assets/icons";

type UploadDropzoneProps = {
  /** `null` means the file was removed. */
  onFileSelect?: (file: File | null) => void;
  file?: File | null;
  /** Passed straight to the input, e.g. ".csv,.json". */
  accept?: string;
  /** Shown under the prompt, e.g. "CSV or JSON, up to 25MB". */
  hint?: string;
};

export function UploadDropzone({
  onFileSelect,
  file = null,
  accept,
  hint,
}: UploadDropzoneProps) {
  const inputId = useId();
  const [isDragActive, setDragActive] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileSelect?.(event.target.files?.[0] ?? null);
    // Allow re-selecting the same file after removing it.
    event.target.value = "";
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onFileSelect?.(null);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFileSelect?.(dropped);
  };

  const fileInput = (
    <input
      id={inputId}
      type="file"
      accept={accept}
      onChange={handleChange}
      className="sr-only"
    />
  );

  if (file) {
    return (
      // Same footprint as the empty dropzone, swapped for the picked file.
      <div className="flex items-center gap-3 rounded-xl border border-[#D1D5DB] bg-surface p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink dark:text-[#1a1a4e]">
          <FileIcon />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{file.name}</p>
          <p className="text-xs text-muted">{formatBytes(file.size)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <label
            htmlFor={inputId}
            className="cursor-pointer whitespace-nowrap text-xs font-semibold text-ink underline"
          >
            Replace
          </label>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove selected file"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D9DADB] text-muted"
          >
            <XIcon />
          </button>
        </div>

        {fileInput}
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-surface px-6 py-8 text-center transition-colors sm:py-10 ${
        isDragActive ? "border-cta bg-cta/5" : "border-[#D1D5DB]"
      }`}
    >
      <span className="text-body-text dark:text-ink">
        <UploadIcon className="h-8 w-8" />
      </span>
      <span className="text-[14px] font-semibold leading-[140%] text-[#191C1D] dark:text-ink sm:text-[15px]">
        Drop your file here or browse
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {fileInput}
    </label>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
