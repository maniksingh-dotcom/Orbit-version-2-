export interface PipelineStageConfig {
  key: string;
  label: string;
  color: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStageConfig[] = [
  { key: 'new',         label: 'New',         color: '#6b7280', order: 0, isWon: false, isLost: false },
  { key: 'ongoing',     label: 'Ongoing',     color: '#06b6d4', order: 1, isWon: false, isLost: false },
  { key: 'qualified',   label: 'Qualified',   color: '#f59e0b', order: 2, isWon: false, isLost: false },
  { key: 'demo',        label: 'Demo',        color: '#8b5cf6', order: 3, isWon: false, isLost: false },
  { key: 'proposal',    label: 'Proposal',    color: '#6366f1', order: 4, isWon: false, isLost: false },
  { key: 'negotiation', label: 'Negotiation', color: '#f97316', order: 5, isWon: false, isLost: false },
  { key: 'won',         label: 'Won',         color: '#22c55e', order: 6, isWon: true,  isLost: false },
  { key: 'lost',        label: 'Lost',        color: '#ef4444', order: 7, isWon: false, isLost: true  },
];
