import { NextRequest, NextResponse } from 'next/server';
import { getLedgerService } from '@/lib/ledger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const ledger = getLedgerService();

    // Check version first for fast 304 response
    const currentVersion = await ledger.getRoomVersion(normalizedCode);
    if (currentVersion === null) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const clientETag = req.headers.get('if-none-match');
    const expectedETag = `v-${currentVersion}`;

    if (clientETag && clientETag.replace(/"/g, '') === expectedETag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: `"${expectedETag}"`,
          'Cache-Control': 'no-cache, must-revalidate',
        },
      });
    }

    const room = await ledger.getRoom(normalizedCode);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room, {
      status: 200,
      headers: {
        ETag: `"${expectedETag}"`,
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
