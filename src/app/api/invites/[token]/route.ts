import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        nome: true,
        cognome: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invito non valido' }, { status: 404 });
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ success: false, error: 'Invito scaduto' }, { status: 410 });
    }

    if (invite.usedAt) {
      return NextResponse.json({ success: false, error: 'Invito già utilizzato' }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      invite: {
        email: invite.email,
        nome: invite.nome,
        cognome: invite.cognome,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('Invite fetch error:', error);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
