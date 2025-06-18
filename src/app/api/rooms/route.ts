import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Generate a unique room ID
    const roomId = uuidv4();

    return NextResponse.json({ roomId }, { status: 200 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Could not create room.' },
      { status: 500 }
    );
  }
}