import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    console.log('[API] /users/me endpoint called');
    
    // Get the token from the Authorization header
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('[API] Found token in Authorization header');
    }
    
    // If no token in header, check cookies or query parameters
    if (!token) {
      console.log('[API] No token in Authorization header, checking alternatives');
      
      // For debug/testing, allow fetching user by email from query string
      const url = new URL(request.url);
      const email = url.searchParams.get('email');
      
      if (email) {
        console.log(`[API] Fetching user by email: ${email} (debug mode)`);
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ email });
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        
        // Return user data (excluding password)
        const { password, ...userData } = user;
        userData._id = userData._id.toString(); // Convert ObjectId to string
        
        return NextResponse.json(userData);
      }
      
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      );
    }
    
    // For our simple token format (base64 encoded userId:timestamp)
    let userId = null;
    try {
      const tokenData = Buffer.from(token, 'base64').toString();
      userId = tokenData.split(':')[0]; // Extract userId
      
      console.log(`[API] Decoded token, userId: ${userId}`);
    } catch (error) {
      console.error('[API] Error decoding token:', error);
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }
    
    // Connect to the database
    const { db } = await connectToDatabase();
    
    // Find the user by ID
    let user;
    try {
      user = await db.collection('users').findOne({ 
        _id: new ObjectId(userId) 
      });
      
      console.log(`[API] User lookup result: ${user ? 'Found' : 'Not found'}`);
    } catch (error) {
      console.error('[API] Error looking up user by ID:', error);
      
      // If error is related to ObjectId format, try using userId as a string
      if (error.message.includes('ObjectId')) {
        user = await db.collection('users').findOne({ id: userId });
        console.log(`[API] Fallback user lookup by string ID: ${user ? 'Found' : 'Not found'}`);
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user data (excluding password)
    const { password, ...userData } = user;
    
    // Convert ObjectId to string to ensure it's JSON serializable
    userData._id = userData._id.toString();
    
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error('[API] Error in /users/me:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user data', details: error.message },
      { status: 500 }
    );
  }
} 