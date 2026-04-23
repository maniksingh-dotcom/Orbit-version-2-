'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export interface CompanyStub {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface CompanyContextValue {
  companies: CompanyStub[];
  activeCompany: CompanyStub | null;
  setActiveCompany: (c: CompanyStub | null) => void;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextValue>({
  companies: [],
  activeCompany: null,
  setActiveCompany: () => {},
  loading: true,
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<CompanyStub[]>([]);
  const [active, setActiveState] = useState<CompanyStub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetch('/api/companies')
      .then(r => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) { setLoading(false); return; }
        const list = data as CompanyStub[];
        setCompanies(list);

        // Try restoring last active company from localStorage
        try {
          const saved = localStorage.getItem('orbit-active-company');
          if (saved) {
            const parsed = JSON.parse(saved) as CompanyStub;
            const found = list.find(c => c.id === parsed.id);
            if (found) { setActiveState(found); setLoading(false); return; }
          }
        } catch { /* ignore */ }

        // Auto-set first company when user has companies
        if (list.length >= 1) {
          setActiveState(list[0]);
          localStorage.setItem('orbit-active-company', JSON.stringify(list[0]));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.user?.id]);

  const setActiveCompany = (company: CompanyStub | null) => {
    setActiveState(company);
    if (company) localStorage.setItem('orbit-active-company', JSON.stringify(company));
    else localStorage.removeItem('orbit-active-company');
  };

  return (
    <CompanyContext.Provider value={{ companies, activeCompany: active, setActiveCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
