import { Resolver } from 'dns/promises';
import crypto from 'crypto';
import type { DnsRecordSpec } from './domain-storage';

const resolver = new Resolver();

export interface VerifyResult {
  ok: boolean;
  missing: DnsRecordSpec[];
  mismatched: Array<{ expected: DnsRecordSpec; found?: string[] }>;
  details: Record<string, any>;
}

function normalizeName(domain: string, name: string): string {
  const trimmed = name.trim().replace(/\.$/, '');
  if (trimmed === '@' || trimmed === '') return domain;
  return `${trimmed}.${domain}`.replace(/\.+/g, '.');
}

export async function verifyDns(domain: string, records: DnsRecordSpec[]): Promise<VerifyResult> {
  console.log(`[DNS] verifyDns - Domain: ${domain}, Records to verify: ${records.length}`);
  const missing: DnsRecordSpec[] = [];
  const mismatched: Array<{ expected: DnsRecordSpec; found?: string[] }> = [];
  const details: Record<string, any> = {};

  for (const rec of records) {
    const fqdn = normalizeName(domain, rec.name);
    console.log(`[DNS] verifyDns - Checking ${rec.type} record: ${fqdn}`);
    try {
      if (rec.type === 'TXT') {
        const txt = await resolver.resolveTxt(fqdn);
        const values = txt.map(arr => arr.join(''));
        details[fqdn] = { type: 'TXT', values };
        console.log(`[DNS] verifyDns - TXT ${fqdn}: Found ${values.length} records`);
        if (!values.some(v => v.trim() === rec.value.trim())) {
          console.warn(`[DNS] verifyDns - TXT ${fqdn}: Value mismatch`);
          mismatched.push({ expected: rec, found: values });
        } else {
          console.log(`[DNS] verifyDns - TXT ${fqdn}: Match!`);
        }
      } else if (rec.type === 'MX') {
        const mx = await resolver.resolveMx(fqdn);
        const targets = mx.map(m => `${m.exchange}`);
        details[fqdn] = { type: 'MX', values: targets };
        console.log(`[DNS] verifyDns - MX ${fqdn}: Found ${targets.length} records`);
        if (!targets.some(t => t.toLowerCase() === rec.value.toLowerCase())) {
          console.warn(`[DNS] verifyDns - MX ${fqdn}: Value mismatch`);
          mismatched.push({ expected: rec, found: targets });
        } else {
          console.log(`[DNS] verifyDns - MX ${fqdn}: Match!`);
        }
      } else if (rec.type === 'CNAME') {
        const cname = await resolver.resolveCname(fqdn);
        const targets = cname.map(c => c.replace(/\.$/, '').toLowerCase());
        details[fqdn] = { type: 'CNAME', values: targets };
        console.log(`[DNS] verifyDns - CNAME ${fqdn}: Found ${targets.length} records`);
        if (!targets.some(t => t === rec.value.replace(/\.$/, '').toLowerCase())) {
          console.warn(`[DNS] verifyDns - CNAME ${fqdn}: Value mismatch`);
          mismatched.push({ expected: rec, found: targets });
        } else {
          console.log(`[DNS] verifyDns - CNAME ${fqdn}: Match!`);
        }
      } else if (rec.type === 'A') {
        const a = await resolver.resolve4(fqdn);
        details[fqdn] = { type: 'A', values: a };
        console.log(`[DNS] verifyDns - A ${fqdn}: Found ${a.length} records`);
        if (!a.includes(rec.value)) {
          console.warn(`[DNS] verifyDns - A ${fqdn}: Value mismatch`);
          mismatched.push({ expected: rec, found: a });
        } else {
          console.log(`[DNS] verifyDns - A ${fqdn}: Match!`);
        }
      } else if (rec.type === 'AAAA') {
        const aaaa = await resolver.resolve6(fqdn);
        details[fqdn] = { type: 'AAAA', values: aaaa };
        console.log(`[DNS] verifyDns - AAAA ${fqdn}: Found ${aaaa.length} records`);
        if (!aaaa.includes(rec.value)) {
          console.warn(`[DNS] verifyDns - AAAA ${fqdn}: Value mismatch`);
          mismatched.push({ expected: rec, found: aaaa });
        } else {
          console.log(`[DNS] verifyDns - AAAA ${fqdn}: Match!`);
        }
      }
    } catch (err: any) {
      console.error(`[DNS] verifyDns - Error checking ${rec.type} ${fqdn}:`, err?.message);
      details[fqdn] = { error: err?.message };
      if (rec.required !== false) {
        missing.push(rec);
      }
    }
  }

  const ok = missing.length === 0 && mismatched.length === 0;
  console.log(`[DNS] verifyDns - SUMMARY: ok=${ok}, missing=${missing.length}, mismatched=${mismatched.length}`);
  return { ok, missing, mismatched, details };
}

export function generateDkimSelectorKeyPair(selector: string = 'default'): {
  selector: string;
  publicKey: string;
  privateKeyPem: string;
  txtValue: string; // DKIM TXT value (e.g., "v=DKIM1; k=rsa; p=...")
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const pub = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const txtValue = `v=DKIM1; k=rsa; p=${pub}`;

  return { selector, publicKey: pub, privateKeyPem: privateKey, txtValue };
}
