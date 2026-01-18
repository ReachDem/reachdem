import { NextResponse } from 'next/server';
import { getDomain, updateDomainStatus } from '@/lib/domain-storage';
import { verifyDns } from '@/lib/dns-verify';
import { alibabaCheckDomain, alibabaQueryDomain, alibabaDescribeDomain, parseDomainAuthStatus } from '@/lib/alibaba-email';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    console.log(`[API] GET /api/domains/${domain}/verify - Starting verification...`);
    const entry = await getDomain(domain);
    if (!entry) {
      console.warn(`[API] GET /api/domains/${domain}/verify - Domain not found`);
      return NextResponse.json({ error: 'Domaine introuvable' }, { status: 404 });
    }

    console.log(`[API] GET /api/domains/${domain}/verify - Step 1: Verify DNS records...`);
    const result = await verifyDns(entry.domain, entry.records || []);
    console.log(`[API] GET /api/domains/${domain}/verify - DNS verification result:`, { ok: result.ok, missing: result.missing.length, mismatched: result.mismatched.length });

    let alibabaStatus: any = undefined;
    let alibabaAuthStatus: any = undefined;
    
    if (entry.provider === 'alibaba_dm') {
      console.log(`[API] GET /api/domains/${domain}/verify - Step 2: Querying Alibaba for domainId...`);
      const queryResp = await alibabaQueryDomain(entry.domain);
      
      if (queryResp.success && queryResp.data?.body?.data?.domain?.[0]) {
        const domainInfo = queryResp.data.body.data.domain[0];
        const domainId = Number(domainInfo.domainId);
        
        console.log(`[API] GET /api/domains/${domain}/verify - Step 3: Describing domain from Alibaba (domainId=${domainId})...`);
        const descResp = await alibabaDescribeDomain(domainId, true);
        
        if (descResp.success && descResp.data?.body) {
          const descBody = descResp.data.body;
          console.log(`[API] GET /api/domains/${domain}/verify - Alibaba DescDomain auth status:`, {
            spfAuthStatus: descBody.spfAuthStatus,
            mxAuthStatus: descBody.mxAuthStatus,
            dkimAuthStatus: descBody.dkimAuthStatus,
            dmarcAuthStatus: descBody.dmarcAuthStatus,
            cnameAuthStatus: descBody.cnameAuthStatus,
          });
          
          alibabaAuthStatus = parseDomainAuthStatus(descBody);
          console.log(`[API] GET /api/domains/${domain}/verify - Parsed auth status:`, alibabaAuthStatus);
          
          alibabaStatus = {
            domainId,
            domainStatus: descBody.domainStatus,
            authStatus: alibabaAuthStatus,
            dnsValues: {
              dnsTxt: descBody.dnsTxt,
              dnsSpf: descBody.dnsSpf,
              dnsMx: descBody.dnsMx,
              dnsDmarc: descBody.dnsDmarc,
            },
          };
        } else {
          console.error(`[API] GET /api/domains/${domain}/verify - Failed to get DescDomain`);
        }
      }
    }

    // Status: verified only if Alibaba says all records are authenticated (0 = verified)
    const status = alibabaAuthStatus?.allVerified ? 'verified' : 'pending';
    console.log(`[API] GET /api/domains/${domain}/verify - Final status: ${status}`);
    
    const updated = await updateDomainStatus(entry.domain, status, {
      ...result,
      alibabaStatus,
    });

    console.log(`[API] GET /api/domains/${domain}/verify - SUCCESS`);
    return NextResponse.json({
      domain: updated,
      verification: result,
      alibabaStatus,
    });
  } catch (error: any) {
    console.error('[API] GET /api/domains/[domain]/verify - EXCEPTION:', error.message, error.stack);
    return NextResponse.json({ error: error?.message ?? 'Unknown error', stack: error.stack }, { status: 500 });
  }
}
