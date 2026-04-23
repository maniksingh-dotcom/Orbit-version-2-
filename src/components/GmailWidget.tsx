"use client";

import { useEffect, useState } from "react";
import AiAssistButton from "./AiAssistButton";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  customerName: string | null;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
  hasReply?: boolean;
  replies?: Array<{
    body: string;
    subject: string;
    createdAt: string;
  }>;
}

export default function GmailWidget() {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetch("/api/gmail")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmails(data);
        } else if (data.error) {
          // Server returned an error object
          console.error("Gmail API error:", data);
          setError(data.hint || data.details || "Could not load emails. Please try signing out and signing in again.");
        } else {
          setError("Could not load emails. Make sure you've signed in again after the Gmail permission update.");
        }
      })
      .catch((err) => {
        console.error("Gmail fetch error:", err);
        setError("Failed to fetch emails. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  async function handleReply(msg: GmailMessage) {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch("/api/gmail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msg.id,
          threadId: msg.threadId,
          to: msg.fromEmail,
          subject: msg.subject,
          body: replyText.trim(),
        }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        // Refresh emails to show the new reply
        const refreshRes = await fetch("/api/gmail");
        const refreshData = await refreshRes.json();
        if (Array.isArray(refreshData)) setEmails(refreshData);
      } else {
        alert("Failed to send reply. Please try again.");
      }
    } finally {
      setSendingReply(false);
    }
  }

  return (
    <div className="gmail-widget">
      <div className="gmail-widget-header">
        <div className="gmail-widget-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="var(--accent-primary)" />
          </svg>
          <span>Customer Emails</span>
        </div>
        {!loading && !error && (
          <span className="gmail-count">{emails.length} message{emails.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      <div className="gmail-widget-body">
        {loading && (
          <div className="gmail-loading">Loading emails…</div>
        )}

        {error && (
          <div className="gmail-error">{error}</div>
        )}

        {!loading && !error && emails.length === 0 && (
          <div className="gmail-empty">No emails from customers yet.</div>
        )}

        {!loading && !error && emails.map((msg) => {
          const isExpanded = expandedId === msg.id;
          const isReplying = replyingTo === msg.id;

          return (
            <div
              key={msg.id}
              className={`gmail-email-row${isExpanded ? " gmail-email-expanded" : ""}${!msg.isRead ? " gmail-unread" : ""}`}
            >
              {/* Row header — click to expand */}
              <div
                className="gmail-email-summary"
                onClick={() => {
                  setExpandedId(isExpanded ? null : msg.id);
                  if (isExpanded) setReplyingTo(null);
                }}
              >
                <div className="gmail-avatar">
                  {(msg.customerName || msg.from)[0]?.toUpperCase() || "?"}
                </div>
                <div className="gmail-email-meta">
                  <div className="gmail-email-top">
                    <span className="gmail-sender">
                      {msg.customerName || msg.from}
                    </span>
                    <span className="gmail-email-address">{msg.fromEmail}</span>
                    <span className="gmail-time">{formatDate(msg.date)}</span>
                  </div>
                  <div className="gmail-subject">
                    {msg.subject}
                    {msg.hasReply && (
                      <span className="badge badge-fathom" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        ✓ Replied
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <div className="gmail-snippet">{msg.snippet}</div>
                  )}
                </div>
                {!msg.isRead && <span className="gmail-unread-dot" />}
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className="gmail-email-body-wrap">
                  <div className="gmail-email-body">{msg.body || msg.snippet}</div>

                  {/* Show sent replies */}
                  {msg.hasReply && msg.replies && msg.replies.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                        Your {msg.replies.length > 1 ? `Replies (${msg.replies.length})` : 'Reply'}:
                      </div>
                      {msg.replies.map((reply, idx) => (
                        <div key={idx} style={{
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: '6px',
                          borderLeft: '3px solid var(--accent-primary)'
                        }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Sent {formatDate(reply.createdAt)}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                            {reply.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply toggle */}
                  {!isReplying ? (
                    <button
                      className="gmail-reply-btn"
                      onClick={() => setReplyingTo(msg.id)}
                    >
                      ↩ Reply
                    </button>
                  ) : (
                    <div className="gmail-reply-box">
                      <div className="gmail-reply-to">To: {msg.fromEmail}</div>
                      <textarea
                        className="gmail-reply-textarea"
                        placeholder="Write your reply…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(msg);
                          }
                        }}
                        rows={4}
                        autoFocus
                      />
                      <div className="gmail-reply-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleReply(msg)}
                          disabled={sendingReply || !replyText.trim()}
                        >
                          {sendingReply ? "Sending…" : "Send Reply"}
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          disabled={sendingReply}
                        >
                          Cancel
                        </button>
                        <AiAssistButton
                          text={replyText || msg.body || msg.snippet}
                          onResult={(result) => setReplyText(result)}
                          actions={replyText.trim() ? ["rephrase", "draft_reply"] : ["draft_reply"]}
                          context={`Replying to email from ${msg.from} (${msg.fromEmail}). Subject: ${msg.subject}. Original message: ${msg.body || msg.snippet}`}
                          size="md"
                        />
                      </div>
                      <div className="gmail-reply-hint">Shift+Enter for new line • Enter to send</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
