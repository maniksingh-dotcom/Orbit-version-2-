"use client";

import { useState, useRef, useEffect } from "react";

export type AiActionType =
  | "rephrase"
  | "summarize"
  | "draft_reply"
  | "expand"
  | "insights"
  | "suggest_actions";

interface AiAction {
  type: AiActionType;
  label: string;
}

const ACTION_LABELS: Record<AiActionType, string> = {
  rephrase: "Rephrase",
  summarize: "Summarize",
  draft_reply: "Draft Reply",
  expand: "Expand",
  insights: "Get Insights",
  suggest_actions: "Suggest Actions",
};

interface AiAssistButtonProps {
  text: string;
  onResult: (result: string) => void;
  actions: AiActionType[];
  context?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function AiAssistButton({
  text,
  onResult,
  actions,
  context,
  disabled,
  size = "sm",
}: AiAssistButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const actionList: AiAction[] = actions.map((a) => ({
    type: a,
    label: ACTION_LABELS[a] || a,
  }));

  async function handleAction(actionType: AiActionType) {
    if (!text.trim()) return;
    setOpen(false);
    setLoading(true);
    setCurrentAction(ACTION_LABELS[actionType]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, text, context }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("AI API error:", res.status, errorData);
        throw new Error(errorData.error || "AI request failed");
      }

      const data = await res.json();
      if (data.result) {
        setPreview(data.result);
      }
    } catch (error) {
      console.error("AI request error:", error);
      setPreview(null);
      alert("AI request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function acceptPreview() {
    if (preview) {
      onResult(preview);
      setPreview(null);
    }
  }

  function discardPreview() {
    setPreview(null);
  }

  // Single action → direct click, no dropdown
  const isSingle = actionList.length === 1;

  return (
    <div className="ai-assist-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`ai-assist-btn ${size === "md" ? "ai-assist-md" : ""}`}
        onClick={() => {
          if (loading) return;
          if (isSingle) {
            handleAction(actionList[0].type);
          } else {
            setOpen(!open);
          }
        }}
        disabled={disabled || !text.trim() || loading}
        title={isSingle ? actionList[0].label : "AI Assist"}
      >
        {loading ? (
          <span className="ai-spinner" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        )}
        {size === "md" && !loading && (
          <span>{isSingle ? actionList[0].label : "AI"}</span>
        )}
        {loading && size === "md" && <span>{currentAction}…</span>}
      </button>

      {/* Dropdown for multiple actions */}
      {open && !isSingle && (
        <div className="ai-dropdown">
          {actionList.map((a) => (
            <button
              key={a.type}
              className="ai-dropdown-item"
              onClick={() => handleAction(a.type)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
                  fill="currentColor"
                />
              </svg>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="ai-preview-overlay" onClick={discardPreview}>
          <div className="ai-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-preview-header">
              <span>AI {currentAction} Result</span>
              <button className="ai-preview-close" onClick={discardPreview}>
                &times;
              </button>
            </div>
            <div className="ai-preview-body">{preview}</div>
            <div className="ai-preview-actions">
              <button className="btn btn-primary btn-sm" onClick={acceptPreview}>
                Accept
              </button>
              <button className="btn btn-outline btn-sm" onClick={discardPreview}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
