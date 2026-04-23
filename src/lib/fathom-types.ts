// Shared Fathom types — no server-side imports, safe for client components

export interface FathomMeeting {
  recording_id: number;
  title: string;
  meeting_title: string;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  recording_start_time: string | null;
  recording_end_time: string | null;
  default_summary: string | { template_name: string; markdown_formatted: string } | null;
  transcript: string | null;
  action_items: string | null;
  calendar_invitees: Array<{ email: string; name: string; is_external: boolean }> | null;
  recorded_by: { name: string; email: string } | null;
}

export function normalizeSummary(
  summary: FathomMeeting['default_summary']
): string | null {
  if (!summary) return null;
  if (typeof summary === 'string') return summary;
  if (typeof summary === 'object' && summary.markdown_formatted) return summary.markdown_formatted;
  return null;
}
