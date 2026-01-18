import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/alibaba-email';
import { addEmail } from '@/lib/email-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountName,
      fromAlias,
      addressType = 1,
      replyToAddress = true,
      toAddress,
      subject,
      htmlBody,
      textBody,
    } = body;

    // Validation
    if (!accountName || !toAddress || !subject) {
      return NextResponse.json(
        { error: 'accountName, toAddress et subject sont requis' },
        { status: 400 }
      );
    }

    if (!htmlBody && !textBody) {
      return NextResponse.json(
        { error: 'htmlBody ou textBody est requis' },
        { status: 400 }
      );
    }

    // Envoyer l'email via Alibaba Cloud
    const result = await sendEmail({
      accountName,
      fromAlias: fromAlias || 'No Reply',
      addressType,
      replyToAddress,
      toAddress,
      subject,
      htmlBody,
      textBody,
    });

    // Enregistrer dans le fichier de stockage
    const emailRecord = await addEmail({
      to: toAddress,
      subject,
      htmlBody,
      textBody,
      fromAlias: fromAlias || 'No Reply',
      accountName,
      addressType,
      replyToAddress,
      status: result.success ? 'sent' : 'failed',
      deliveryStatus: result.success ? 'pending' : undefined,
      alibabaResponse: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error,
    });

    return NextResponse.json({
      success: result.success,
      emailRecord,
      alibabaResponse: result.data,
      error: result.error,
      recommendation: result.recommendation,
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email', details: error.message },
      { status: 500 }
    );
  }
}
