"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { UploadIcon } from "@/components/ui/upload";
import { CheckIcon } from "@/components/ui/check";

interface AvatarUploaderProps {
  /** Current profile image URL */
  currentImage: string;
  /** User's display name (for initial-letter fallback) */
  userName: string;
  /** Callback when avatar is updated */
  onAvatarChange: (newImage: string) => void;
  /** Optional size class (default: "w-24 h-24") */
  size?: string;
  /** Optional accent color class */
  accentColor?: string;
}

export default function AvatarUploader({
  currentImage,
  userName,
  onAvatarChange,
  size = "w-24 h-24",
  accentColor = "from-amber-500 to-primary-500",
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  // ─── Upload image file ───
  const handleFileUpload = useCallback(async (file: File) => {
    clearMessages();

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/auth/settings/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onAvatarChange(data.profileImage);
        setSuccessMsg("Avatar updated!");
        setTimeout(() => setSuccessMsg(""), 2500);
      } else {
        setError(data.message || "Upload failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onAvatarChange]);

  // ─── Remove avatar ───
  const handleRemove = useCallback(async () => {
    clearMessages();
    setUploading(true);

    try {
      const res = await fetch("/api/auth/settings/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: "" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onAvatarChange("");
        setSuccessMsg("Avatar removed.");
        setTimeout(() => setSuccessMsg(""), 2500);
      } else {
        setError(data.message || "Failed to remove avatar.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onAvatarChange]);

  // ─── Drag & drop ───
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // ─── Render avatar preview ───
  const renderAvatar = () => {
    if (uploading) {
      return (
        <div className={`${size} rounded-full bg-gradient-to-br ${accentColor} flex items-center justify-center shadow-lg`}>
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      );
    }

    if (currentImage && (currentImage.startsWith("/") || currentImage.startsWith("http") || currentImage.startsWith("data:"))) {
      return (
        <div className={`${size} rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-stone-900`}>
          <img
            src={currentImage}
            alt="Profile avatar"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // Default fallback — initial letter
    return (
      <div className={`${size} rounded-full bg-gradient-to-br ${accentColor} flex items-center justify-center shadow-lg border-4 border-white dark:border-stone-900 text-3xl font-black text-white`}>
        {userName ? userName.charAt(0).toUpperCase() : "?"}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* Avatar preview with camera overlay */}
      <div
        className={`relative group cursor-pointer ${dragOver ? "scale-105" : ""} transition-transform duration-200`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {renderAvatar()}

        {/* Camera overlay on hover */}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer">
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}

        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-primary-500 bg-primary-500/20 flex items-center justify-center"
            >
              <UploadIcon className="w-6 h-6 text-primary-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
          Upload Photo
        </button>

        {currentImage && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-full"
          >
            {error}
          </motion.p>
        )}
        {successMsg && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            <CheckIcon className="w-3 h-3" />
            {successMsg}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center max-w-[220px]">
        Drag & drop or upload a photo. Max 5 MB.
      </p>
    </div>
  );
}

