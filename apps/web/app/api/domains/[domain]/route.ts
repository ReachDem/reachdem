import { NextRequest, NextResponse } from 'next/server';
import { getDomain, updateDomainRecords } from '@/lib/domain-storage';

// Get domain details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    console.log(`[API] GET /api/domains/${domain} - Fetching domain...`);
    const entry = await getDomain(domain);
    if (!entry) {
      console.warn(`[API] GET /api/domains/${domain} - Domain not found`);
      return NextResponse.json({ error: 'Domaine introuvable' }, { status: 404 });
    }
    console.log(`[API] GET /api/domains/${domain} - Found:`, entry.id);
    return NextResponse.json({ domain: entry });
  } catch (error: any) {
    console.error(`[API] GET /api/domains/${params} - ERROR:`, error.message, error);
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
}

// Update domain records (e.g., import from provider)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    console.log(`[API] PATCH /api/domains/${domain} - Starting...`);
    const body = await req.json();
    console.log(`[API] PATCH /api/domains/${domain} - Body:`, body);
    const { records } = body as { records: import('@/lib/domain-storage').DnsRecordSpec[] };
    if (!records || !Array.isArray(records)) {
      console.warn(`[API] PATCH /api/domains/${domain} - Invalid records`);
      return NextResponse.json({ error: 'records est requis (array)' }, { status: 400 });
    }
    console.log(`[API] PATCH /api/domains/${domain} - Updating ${records.length} records...`);
    const updated = await updateDomainRecords(domain, records);
    if (!updated) {
      console.warn(`[API] PATCH /api/domains/${domain} - Domain not found`);
      return NextResponse.json({ error: 'Domaine introuvable' }, { status: 404 });
    }
    console.log(`[API] PATCH /api/domains/${domain} - SUCCESS`);
    return NextResponse.json({ domain: updated });
  } catch (error: any) {
    console.error(`[API] PATCH /api/domains/${params} - ERROR:`, error.message, error);
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
}
