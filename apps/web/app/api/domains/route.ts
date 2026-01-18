import { NextRequest, NextResponse } from 'next/server';
import { addDomain, getAllDomains } from '@/lib/domain-storage';
import { generateDkimSelectorKeyPair } from '@/lib/dns-verify';
import { alibabaCreateDomain } from '@/lib/alibaba-email';

// List all domains
export async function GET() {
  try {
    console.log('[API] GET /api/domains - Fetching all domains...');
    const domains = await getAllDomains();
    console.log(`[API] GET /api/domains - Found ${domains.length} domains`, domains);
    return NextResponse.json({ domains });
  } catch (error: any) {
    console.error('[API] GET /api/domains - ERROR:', error.message, error);
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
}

// Create domain entry and generate initial records
export async function POST(req: NextRequest) {
  try {
    console.log('[API] POST /api/domains - Starting...');
    const body = await req.json();
    console.log('[API] POST /api/domains - Body:', body);
    const { domain, provider = 'alibaba_dm', dkimSelector = 'default' } = body;

    if (!domain) {
      console.warn('[API] POST /api/domains - Missing domain');
      return NextResponse.json({ error: 'domain est requis' }, { status: 400 });
    }

    console.log(`[API] POST /api/domains - Creating domain: ${domain}, provider: ${provider}`);
    const records = [] as import('@/lib/domain-storage').DnsRecordSpec[];

    // Always generate a DKIM key pair for demonstration or custom providers
    console.log('[API] POST /api/domains - Generating DKIM key...');
    const dkim = generateDkimSelectorKeyPair(dkimSelector);
    console.log('[API] POST /api/domains - DKIM generated:', { selector: dkim.selector });
    
    records.push({
      type: 'TXT',
      name: `${dkim.selector}._domainkey`,
      value: dkim.txtValue,
      required: provider === 'generic',
      description: 'DKIM key for email signing (generic setup). For Alibaba DM, use their provided DKIM record instead.',
    });

    // Generic SPF recommendation (user may adapt for provider)
    records.push({
      type: 'TXT',
      name: '@',
      value: 'v=spf1 a mx ~all',
      required: false,
      description: 'Generic SPF example. Replace with provider-specific include.',
    });

    console.log('[API] POST /api/domains - Calling Alibaba CreateDomain first...');
    let alibabaResponse: any | undefined = undefined;
    
    if (provider === 'alibaba_dm') {
      const resp = await alibabaCreateDomain(domain);
      console.log('[API] POST /api/domains - Alibaba response:', resp);
      alibabaResponse = resp;
      
      if (!resp.success) {
        console.error('[API] POST /api/domains - Alibaba CreateDomain FAILED, aborting domain creation');
        return NextResponse.json({
          error: 'Alibaba DM creation failed',
          details: resp.error,
          recommendation: resp.recommendation,
        }, { status: 400 });
      }
      console.log('[API] POST /api/domains - Alibaba CreateDomain SUCCESS, proceeding with local storage...');
    }

    console.log('[API] POST /api/domains - Adding to storage with records:', records.length);
    const entry = await addDomain({
      domain,
      provider,
      records,
    });
    console.log('[API] POST /api/domains - Domain entry created:', entry.id);

    console.log('[API] POST /api/domains - SUCCESS - Returning domain entry');
    return NextResponse.json({
      domain: entry,
      note: provider === 'alibaba_dm'
        ? 'Domaine créé chez Alibaba. Configurez les DNS et vérifiez.'
        : undefined,
      dkimPrivateKeyPem: dkim.privateKeyPem,
      alibabaResponse,
    });
  } catch (error: any) {
    console.error('[API] POST /api/domains - EXCEPTION:', error.message, error.stack);
    return NextResponse.json({ error: error?.message ?? 'Unknown error', stack: error.stack }, { status: 500 });
  }
}
