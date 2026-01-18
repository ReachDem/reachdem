import { promises as fs } from 'fs';
import path from 'path';

export type DnsRecordType = 'TXT' | 'MX' | 'CNAME' | 'A' | 'AAAA';

export interface DnsRecordSpec {
  type: DnsRecordType;
  name: string; // relative name, e.g. "default._domainkey"
  value: string; // expected value
  required?: boolean; // default true
  description?: string;
}

export interface DomainEntry {
  id: string;
  domain: string;
  provider: 'generic' | 'alibaba_dm';
  records: DnsRecordSpec[];
  status: 'pending' | 'verified' | 'failed';
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastCheckAt?: string; // ISO
  lastCheckResult?: {
    ok: boolean;
    missing: DnsRecordSpec[];
    mismatched: Array<{ expected: DnsRecordSpec; found?: string[] }>;
    details?: any;
    alibabaStatus?: any;
  };
}

const STORAGE_FILE = path.join(process.cwd(), 'domains-log.json');

async function initStorage(): Promise<void> {
  try {
    await fs.access(STORAGE_FILE);
    console.log('[STORAGE] Init: domains-log.json already exists');
  } catch {
    console.log('[STORAGE] Init: Creating new domains-log.json');
    await fs.writeFile(STORAGE_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function getAllDomains(): Promise<DomainEntry[]> {
  console.log('[STORAGE] getAllDomains - Reading from file...');
  await initStorage();
  const data = await fs.readFile(STORAGE_FILE, 'utf-8');
  const domains = JSON.parse(data);
  console.log('[STORAGE] getAllDomains - Found:', domains.length, 'domains');
  return domains;
}

export async function getDomain(domain: string): Promise<DomainEntry | undefined> {
  console.log(`[STORAGE] getDomain - Searching for: ${domain}`);
  const list = await getAllDomains();
  const result = list.find(d => d.domain.toLowerCase() === domain.toLowerCase());
  console.log(`[STORAGE] getDomain - Result:`, result ? 'Found' : 'Not found');
  return result;
}

export async function addDomain(entry: Omit<DomainEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: DomainEntry['status'] }): Promise<DomainEntry> {
  console.log('[STORAGE] addDomain - Adding new domain:', entry.domain);
  const list = await getAllDomains();
  const newEntry: DomainEntry = {
    ...entry,
    id: `domain_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: entry.status ?? 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log('[STORAGE] addDomain - New ID:', newEntry.id);
  list.unshift(newEntry);
  await fs.writeFile(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  console.log('[STORAGE] addDomain - SUCCESS');
  return newEntry;
}

export async function updateDomainRecords(domain: string, records: DnsRecordSpec[]): Promise<DomainEntry | null> {
  console.log(`[STORAGE] updateDomainRecords - Domain: ${domain}, Records: ${records.length}`);
  const list = await getAllDomains();
  const idx = list.findIndex(d => d.domain.toLowerCase() === domain.toLowerCase());
  if (idx === -1) {
    console.warn(`[STORAGE] updateDomainRecords - Domain not found: ${domain}`);
    return null;
  }
  list[idx] = {
    ...list[idx],
    records,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  console.log(`[STORAGE] updateDomainRecords - SUCCESS`);
  return list[idx];
}

export async function updateDomainStatus(domain: string, status: DomainEntry['status'], lastCheckResult?: DomainEntry['lastCheckResult']): Promise<DomainEntry | null> {
  console.log(`[STORAGE] updateDomainStatus - Domain: ${domain}, Status: ${status}`);
  const list = await getAllDomains();
  const idx = list.findIndex(d => d.domain.toLowerCase() === domain.toLowerCase());
  if (idx === -1) {
    console.warn(`[STORAGE] updateDomainStatus - Domain not found: ${domain}`);
    return null;
  }
  list[idx] = {
    ...list[idx],
    status,
    lastCheckAt: new Date().toISOString(),
    lastCheckResult: lastCheckResult ?? list[idx].lastCheckResult,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  console.log(`[STORAGE] updateDomainStatus - SUCCESS`);
  return list[idx];
}
