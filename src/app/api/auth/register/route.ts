import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Registrazione non disponibile' },
    { status: 403 }
  );
}
