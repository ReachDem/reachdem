"use client";
import { useEffect, useState } from 'react';

type DnsRecordSpec = {
  type: 'TXT' | 'MX' | 'CNAME' | 'A' | 'AAAA';
  name: string;
  value: string;
  required?: boolean;
  description?: string;
};

export default function DomainTestPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [domain, setDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  async function fetchDomains() {
    try {
      console.log('[UI] fetchDomains - Fetching domains...');
      const res = await fetch('/api/domains');
      const data = await res.json();
      console.log('[UI] fetchDomains - Response:', data);
      setDomains(data.domains || []);
      console.log('[UI] fetchDomains - SUCCESS, loaded:', data.domains?.length || 0, 'domains');
    } catch (err: any) {
      console.error('[UI] fetchDomains - ERROR:', err);
    }
  }

  async function verifyAllDomains() {
    console.log('[UI] verifyAllDomains - Verifying all domains on page load...');
    for (const d of domains) {
      await verify(d);
    }
  }

  useEffect(() => { 
    fetchDomains();
  }, []);

  async function createDomain() {
    if (!domain) {
      console.warn('[UI] createDomain - Domain is empty');
      return;
    }
    console.log('[UI] createDomain - Creating domain on Alibaba:', domain);
    setCreating(true);
    try {
      // Étape 1: Créer sur Alibaba
      const payload = { domain, provider: 'alibaba_dm' };
      console.log('[UI] createDomain - Payload:', payload);
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('[UI] createDomain - Response:', data);
      if (data.error) {
        console.error('[UI] createDomain - API Error:', data.error);
        alert('Erreur: ' + data.error);
        return;
      }

      // Étape 2: Importer automatiquement les DNS depuis Alibaba
      console.log('[UI] createDomain - Auto-importing DNS from Alibaba...');
      const importRes = await fetch(`/api/domains/${domain}/import-alibaba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const importData = await importRes.json();
      console.log('[UI] createDomain - Import response:', importData);

      setDomain('');
      await fetchDomains();
      console.log('[UI] createDomain - SUCCESS');
      alert(`✅ Domaine créé!\nID Alibaba: ${data.domainId}\n${importData.imported || 0} DNS records importés`);
    } catch (err: any) {
      console.error('[UI] createDomain - ERROR:', err);
      alert('Erreur: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function verify(d: any) {
    console.log('[UI] verify - Verifying domain:', d.domain);
    setVerifying(d.domain);
    try {
      const res = await fetch(`/api/domains/${d.domain}/verify`);
      const data = await res.json();
      console.log('[UI] verify - Response:', data);
      if (data.error) {
        console.error('[UI] verify - API Error:', data.error);
        return;
      }
      await fetchDomains();
      console.log('[UI] verify - SUCCESS, Alibaba auth status:', data.alibabaStatus?.authStatus);
      if (data.alibabaStatus?.authStatus?.allVerified) {
        console.log('[UI] verify - Domain is VERIFIED ✓');
      } else {
        console.log('[UI] verify - Domain still pending, auth details:', data.alibabaStatus?.authStatus?.details);
      }
    } catch (err: any) {
      console.error('[UI] verify - ERROR:', err);
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold">Configuration DNS pour envoi d'emails</h1>
      <p className="text-gray-500 mt-2">Créez un domaine sur Alibaba Cloud, puis configurez les DNS records chez votre registrar (Namecheap, GoDaddy, etc.).</p>

      <div className="flex gap-2 mt-4">
        <input
          className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ex: mail.mondomaine.com"
          value={domain}
          onChange={e => setDomain(e.target.value)}
        />
        <button
          onClick={createDomain}
          disabled={creating}
          className={`px-4 py-2 rounded-md text-white ${creating ? 'bg-blue-400 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {creating ? 'Création...' : 'Créer le domaine'}
        </button>
      </div>

      <hr className="my-6 border-gray-200" />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            console.log('[UI] Verifying all domains...');
            domains.forEach(d => verify(d));
          }}
          disabled={verifying !== null}
          className={`px-4 py-2 rounded-md text-white ${verifying !== null ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        >
          🔄 Vérifier tous les domaines
        </button>
      </div>

      <div className="grid gap-4">
        {domains.map(d => (
          <div key={d.id} className="border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{d.domain}</div>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${d.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.status === 'verified' ? '✅ Vérifié' : '⏳ En attente'}</span>
                  {d.records?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700">{d.records.length} DNS records</span>
                  )}
                  {d.lastCheckResult?.alibabaStatus?.authStatus && (
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.lastCheckResult.alibabaStatus.authStatus.details.spf === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>SPF: {d.lastCheckResult.alibabaStatus.authStatus.details.spf === 0 ? '✓' : '✗'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.lastCheckResult.alibabaStatus.authStatus.details.mx === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>MX: {d.lastCheckResult.alibabaStatus.authStatus.details.mx === 0 ? '✓' : '✗'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.lastCheckResult.alibabaStatus.authStatus.details.dkim === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>DKIM: {d.lastCheckResult.alibabaStatus.authStatus.details.dkim === 0 ? '✓' : '✗'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.lastCheckResult.alibabaStatus.authStatus.details.dmarc === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>DMARC: {d.lastCheckResult.alibabaStatus.authStatus.details.dmarc === 0 ? '✓' : '✗'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => verify(d)} disabled={verifying === d.domain} className={`px-3 py-2 rounded-md text-white ${verifying === d.domain ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{verifying === d.domain ? 'Vérification...' : 'Vérifier'}</button>
              </div>
            </div>

            <h3 className="mt-4 mb-2 font-medium">DNS à configurer</h3>
            <div className="grid gap-3">
              {(d.records || []).map((r: DnsRecordSpec, idx: number) => {
                // Déterminer le statut du record en fonction de son type
                let recordStatus = null;
                const authStatus = d.lastCheckResult?.alibabaStatus?.authStatus?.details;
                
                if (r.type === 'MX') {
                  recordStatus = authStatus?.mx === 0 ? 'verified' : 'pending';
                } else if (r.type === 'TXT') {
                  if (r.description?.includes('SPF')) {
                    recordStatus = authStatus?.spf === 0 ? 'verified' : 'pending';
                  } else if (r.description?.includes('DKIM')) {
                    recordStatus = authStatus?.dkim === 0 ? 'verified' : 'pending';
                  } else if (r.description?.includes('DMARC')) {
                    recordStatus = authStatus?.dmarc === 0 ? 'verified' : 'pending';
                  }
                }
                
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{r.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.required !== false ? 'bg-amber-200' : 'bg-gray-200'}`}>{r.required !== false ? 'Requis' : 'Optionnel'}</span>
                      {recordStatus && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${recordStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {recordStatus === 'verified' ? '✓ Vérifié' : '✗ En attente'}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <div>
                        <div className="text-xs text-gray-500">Nom</div>
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2">{r.name}</div>
                          <button onClick={() => copy(r.name)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white">Copier</button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Valeur</div>
                        <div className="flex items-start gap-2">
                          <div className="font-mono text-sm bg-slate-900 text-slate-200 rounded-md p-3 overflow-x-auto max-w-full">{r.value}</div>
                          <button onClick={() => copy(r.value)} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white">Copier</button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-700">{r.description || '-'}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {d.lastCheckResult && (
              <details className="mt-4">
                <summary>Details vérification</summary>
                <pre className="whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-md p-3">{JSON.stringify(d.lastCheckResult, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
