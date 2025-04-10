import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { randomBytes } from 'crypto';

// Helper to generate a new API key
const generateApiKey = () => {
  return `dvk_${randomBytes(16).toString('hex')}`;
};

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to access API keys' },
        { status: 401 }
      );
    }
    
    const { db } = await connectToDatabase();
    const userId = session.user.id;
    
    // Get the user's API key
    const apiKeyDoc = await db.collection('api_keys').findOne({ userId });
    
    return NextResponse.json({ 
      apiKey: apiKeyDoc?.key || null,
      createdAt: apiKeyDoc?.createdAt || null
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to create an API key' },
        { status: 401 }
      );
    }
    
    const { db } = await connectToDatabase();
    const userId = session.user.id;
    
    // Generate a new API key
    const newApiKey = generateApiKey();
    
    // Store or update the API key in the database
    await db.collection('api_keys').updateOne(
      { userId },
      {
        $set: {
          key: newApiKey,
          userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    return NextResponse.json({ 
      apiKey: newApiKey,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
} 