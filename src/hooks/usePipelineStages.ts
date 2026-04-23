'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { DEFAULT_PIPELINE_STAGES, PipelineStageConfig } from '@/lib/defaultPipelineStages';

export function usePipelineStages() {
  const { activeCompany } = useCompany();
  const [stages, setStages] = useState<PipelineStageConfig[]>(DEFAULT_PIPELINE_STAGES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: HeadersInit = {};
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    setLoading(true);
    fetch('/api/pipeline/stages', { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setStages(d.stages ?? DEFAULT_PIPELINE_STAGES))
      .catch(() => setStages(DEFAULT_PIPELINE_STAGES))
      .finally(() => setLoading(false));
  }, [activeCompany?.id]);

  return { stages, loading };
}
