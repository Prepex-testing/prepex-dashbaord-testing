"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import type { ResourceTypeDef } from "@/lib/resources/catalog";
import { bulkUpload } from "@/lib/api/content";
import { ApiError } from "@/lib/api/http";

type AddResourceModalProps = {
  open: boolean;
  onClose: () => void;
  type: ResourceTypeDef;
  /** Lets the list behind the dialog re-read itself once rows have landed. */
  onUploaded?: () => void;
};

/**
 * Bulk-add dialog: drop a bank file in and confirm.
 *
 * dashboard-service parses the file server-side — it understands the fixed
 * Prepex_*.txt bank formats and nothing else — so the upload posts the file's
 * text verbatim and reports back how many rows were written. A file in the
 * wrong shape comes back as the parser's own message ("No formulas
 * (FORMULA_NAME: ...) found…"), which is more useful than anything this
 * dialog could guess at.
 */
export function AddResourceModal({ open, onClose, type, onUploaded }: AddResourceModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={`Add ${type.label}`}>
      {/* The form only mounts while the dialog is open, so every reopen starts
          from a clean slate without an effect resetting state after the fact. */}
      <AddResourceForm type={type} onClose={onClose} onUploaded={onUploaded} />
    </Modal>
  );
}

function AddResourceForm({
  type,
  onClose,
  onUploaded,
}: {
  type: ResourceTypeDef;
  onClose: () => void;
  onUploaded?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || isUploading) return;

    setError(null);
    setUploading(true);
    try {
      // Read in the browser rather than posting a FormData part: the bulk
      // endpoints take the raw file contents as the request body.
      const text = await file.text();
      const { count } = await bulkUpload(type.uploadTarget, text);
      setResult(count);
      onUploaded?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The file could not be read. Check that it's the right .txt bank file and try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  // A bank file can add thousands of rows, so the count is worth showing
  // rather than closing straight away and leaving the admin to go and count.
  if (result !== null) {
    return (
      <div className="flex flex-col gap-5">
        <div className="pr-8">
          <h2 className="text-xl font-bold text-modal-text">Upload complete</h2>
          <p className="mt-1 text-sm text-modal-subtext">
            {result.toLocaleString()}{" "}
            {result === 1 ? type.singular.toLowerCase() : type.label.toLowerCase()}{" "}
            added to the library.
          </p>
        </div>

        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="pr-8">
        <h2 className="text-xl font-bold text-modal-text">Add {type.label}</h2>
        <p className="mt-1 text-sm text-modal-subtext">
          Upload a bank file to add {type.label.toLowerCase()} to the library.
          Subjects and chapters are matched by the names inside the file.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}

      <UploadDropzone
        file={file}
        onFileSelect={(next) => {
          setFile(next);
          // A new file deserves a clean slate — the last failure was about the
          // file that has just been replaced.
          setError(null);
        }}
        accept={type.accept}
        hint={type.acceptLabel}
      />

      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
        <Button
          variant="secondary"
          className="sm:flex-1"
          onClick={onClose}
          disabled={isUploading}
        >
          Cancel
        </Button>
        {/* Nothing to submit until a file is chosen, so the action stays
            disabled rather than accepting the click and then complaining. */}
        <Button
          type="submit"
          variant="primary"
          className="sm:flex-1 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!file || isUploading}
        >
          {isUploading ? "Uploading..." : `Add ${type.singular}`}
        </Button>
      </div>
    </form>
  );
}
