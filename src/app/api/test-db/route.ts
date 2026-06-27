import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@monivia.it' },
      select: { id: true, email: true, role: true, hashedPassword: true },
    });
    return NextResponse.json({
      found: !!user,
      email: user?.email,
      role: user?.role,
      hasPassword: !!user?.hashedPassword,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
}
