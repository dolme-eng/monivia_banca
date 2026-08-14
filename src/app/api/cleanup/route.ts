import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  newPassword: z.string().min(8).max(128)
    .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
});

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CSRF_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { newPassword } = schema.parse(body);

    const hash = await bcrypt.hash(newPassword, 12);

    const updated = await prisma.user.updateMany({
      where: { email: 'admin@monivia.it' },
      data: { hashedPassword: hash },
    });

    return NextResponse.json({ ok: true, updated: updated.count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
