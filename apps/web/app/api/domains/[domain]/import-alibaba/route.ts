import { NextRequest, NextResponse } from 'next/server';
import { getDomain, updateDomainRecords } from '@/lib/domain-storage';
import { alibabaQueryDomain, alibabaDescribeDomain } from '@/lib/alibaba-email';

// Import and parse Alibaba DM domain configuration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    console.log(`[API] POST /api/domains/${domain}/import-alibaba - Starting...`);
    const entry = await getDomain(domain);
    if (!entry) {
      console.warn(`[API] POST /api/domains/${domain}/import-alibaba - Domain not found`);
      return NextResponse.json({ error: 'Domaine introuvable' }, { status: 404 });
    }

    // Essayer de récupérer les infos depuis Alibaba
    const REGION = process.env.ALIBABA_REGION || 'eu-central-1';
    console.log(`[API] POST /api/domains/${domain}/import-alibaba - Starting config generation (region=${REGION})`);
    console.log(`[API] POST /api/domains/${domain}/import-alibaba - Step 1: Querying Alibaba for domainId via QueryDomainByParam...`);
    const alibabaResp = await alibabaQueryDomain(domain);
    console.log(`[API] POST /api/domains/${domain}/import-alibaba - Alibaba QueryDomain response:`, JSON.stringify(alibabaResp, null, 2));
    
    if (alibabaResp.success && alibabaResp.data?.body?.data?.domain?.[0]) {
      const domainInfo = alibabaResp.data.body.data.domain[0];
      console.log(`[API] POST /api/domains/${domain}/import-alibaba - Found domain in Alibaba:`, domainInfo);
      console.log(`[API] POST /api/domains/${domain}/import-alibaba - Step 2: Describe domain via DescDomain using domainId=${domainInfo.domainId}...`);
      const descResp = await alibabaDescribeDomain(Number(domainInfo.domainId), true);
      console.log(`[API] POST /api/domains/${domain}/import-alibaba - Alibaba DescDomain response:`, JSON.stringify(descResp, null, 2));
      const body = descResp.success ? descResp.data?.body : undefined;
      
      const records: import('@/lib/domain-storage').DnsRecordSpec[] = [];

      // Ownership verification (TXT)
      if (body?.hostRecord && body?.domainType) {
        records.push({
          type: 'TXT',
          name: body.hostRecord,
          value: String(body.domainType),
          required: true,
          description: 'Ownership Verification (Alibaba DM)',
        });
      }

      // Basé sur DescDomain, on récupère DKIM/SPF/DMARC/MX
      const subdomain = domain.split('.')[0]; // ex: mail
      
      if (body?.spfRecordV2) {
        records.push({
          type: 'TXT',
          name: subdomain,
          value: String(body.spfRecordV2),
          required: true,
          description: 'SPF Verification (Alibaba DM)',
        });
      }

      if (body?.dkimPublicKey && body?.dkimRR) {
        records.push({
          type: 'TXT',
          name: String(body.dkimRR),
          value: String(body.dkimPublicKey),
          required: true,
          description: 'DKIM Verification (Alibaba DM)',
        });
      } else {
        console.warn(`[API] POST /api/domains/${domain}/import-alibaba - DKIM not returned by API; skipping DKIM record`);
      }

      if (body?.dmarcHostRecord && body?.dmarcRecord) {
        records.push({
          type: 'TXT',
          name: String(body.dmarcHostRecord),
          value: String(body.dmarcRecord),
          required: false,
          description: 'DMARC Verification (Alibaba DM)',
        });
      }

      if (body?.mxRecord) {
        records.push({
          type: 'MX',
          name: subdomain,
          value: String(body.mxRecord),
          required: true,
          description: 'MX Record for receiving emails (Alibaba DM)',
        });
      }

      console.log(`[API] POST /api/domains/${domain}/import-alibaba - Derived DNS records:`, JSON.stringify(records, null, 2));
      console.log(`[API] POST /api/domains/${domain}/import-alibaba - Saving ${records.length} records...`);
      const updated = await updateDomainRecords(domain, records);
      console.log(`[API] POST /api/domains/${domain}/import-alibaba - SUCCESS`);
      
      return NextResponse.json({ 
        domain: updated,
        imported: records.length,
        message: `${records.length} enregistrements importés depuis Alibaba DM`,
        alibabaInfo: {
          domainId: domainInfo.domainId,
          domainStatus: domainInfo.domainStatus,
          spfAuthStatus: domainInfo.spfAuthStatus,
          mxAuthStatus: domainInfo.mxAuthStatus,
          cnameAuthStatus: domainInfo.cnameAuthStatus,
          desc: body,
        },
      });
    }

    // Fallback: utiliser la config manuelle si Alibaba API échoue
    console.log(`[API] POST /api/domains/${domain}/import-alibaba - Alibaba query failed, using manual config`);
    const body = await req.json();
    const { alibabaConfig } = body;

    // Parse Alibaba's provided DNS records
    // Expected format from Alibaba console copy-paste or API response
    const records: import('@/lib/domain-storage').DnsRecordSpec[] = [];

    // Example parsing (adapt based on actual Alibaba API response structure)
    if (alibabaConfig) {
      console.log(`[API] POST /api/domains/${domain}/import-alibaba - Parsing Alibaba config...`);
      
      // Ownership verification
      if (alibabaConfig.ownership) {
        console.log(`[API] POST /api/domains/${domain}/import-alibaba - Adding ownership record`);
        records.push({
          type: 'TXT',
          name: alibabaConfig.ownership.hostRecord || 'aliyundm.mail',
          value: alibabaConfig.ownership.value,
          required: true,
          description: 'Ownership Verification (Alibaba DM)',
        });
      }

      // SPF
      if (alibabaConfig.spf) {
        console.log(`[API] POST /api/domains/${domain}/import-alibaba - Adding SPF record`);
        records.push({
          type: 'TXT',
          name: alibabaConfig.spf.hostRecord || 'mail',
          value: alibabaConfig.spf.value,
          required: true,
          description: 'SPF Verification (Alibaba DM)',
        });
      }

      // DKIM
      if (alibabaConfig.dkim) {
        console.log(`[API] POST /api/domains/${domain}/import-alibaba - Adding DKIM record`);
        records.push({
          type: 'TXT',
          name: alibabaConfig.dkim.hostRecord || 'aliyun-eu-central-1._domainkey.mail',
          value: alibabaConfig.dkim.value,
          required: true,
          description: 'DKIM Verification (Alibaba DM)',
        });
      }

      // DMARC
      if (alibabaConfig.dmarc) {
        console.log(`[API] POST /api/domains/${domain}/import-alibaba - Adding DMARC record`);
        records.push({
          type: 'TXT',
          name: alibabaConfig.dmarc.hostRecord || '_dmarc.mail',
          value: alibabaConfig.dmarc.value,
          required: false,
          description: 'DMARC Verification (Alibaba DM)',
        });
      }

      // MX
      if (alibabaConfig.mx) {
        console.log(`[API] POST /api/domains/${domain}/import-alibaba - Adding MX record`);
        records.push({
          type: 'MX',
          name: alibabaConfig.mx.hostRecord || 'mail',
          value: alibabaConfig.mx.value,
          required: true,
          description: 'MX Record for receiving emails (Alibaba DM)',
        });
      }
    }

    console.log(`[API] POST /api/domains/${domain}/import-alibaba - Saving ${records.length} records...`);
    const updated = await updateDomainRecords(domain, records);
    console.log(`[API] POST /api/domains/${domain}/import-alibaba - SUCCESS`);
    
    return NextResponse.json({ 
      domain: updated,
      imported: records.length,
      message: `${records.length} enregistrements importés depuis Alibaba DM`,
    });

  } catch (error: any) {
    console.error('[API] POST /api/domains/[domain]/import-alibaba - EXCEPTION:', error.message, error.stack);
    return NextResponse.json({ error: error?.message ?? 'Unknown error', stack: error.stack }, { status: 500 });
  }
}
