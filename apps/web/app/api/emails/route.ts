import { NextResponse } from 'next/server';
import { getAllEmails, getEmailStats } from '@/lib/email-storage';

export async function GET() {
  try {
    const emails = await getAllEmails();
    const stats = await getEmailStats();

    return NextResponse.json({
      emails,
      stats,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des emails', details: error.message },
      { status: 500 }
    );
  }
}
