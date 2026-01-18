import { NextRequest, NextResponse } from 'next/server';
import { updateEmailDeliveryStatus } from '@/lib/email-storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { deliveryStatus } = body;

    if (!deliveryStatus) {
      return NextResponse.json(
        { error: 'deliveryStatus est requis' },
        { status: 400 }
      );
    }

    const updatedEmail = await updateEmailDeliveryStatus(id, deliveryStatus);

    if (!updatedEmail) {
      return NextResponse.json(
        { error: 'Email non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ email: updatedEmail });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: error.message },
      { status: 500 }
    );
  }
}
