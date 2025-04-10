import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request) {
  try {
    console.log('[API] Login endpoint called');
    
    // Parse the request body
    let body;
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = {
          email: formData.get('email'),
          password: formData.get('password')
        };
      } else {
        const text = await request.text();
        try {
          // Try to parse as JSON anyway
          body = JSON.parse(text);
        } catch (parseError) {
          return NextResponse.json(
            { error: 'Unsupported content type' },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      console.error('[API] Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    // Validate inputs
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Login attempt for: ${email}`);
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Find the user by email
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log(`[API] Login failed: User ${email} not found`);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`[API] Login failed: Invalid password for ${email}`);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    console.log(`[API] Login successful for: ${email}`);
    
    // Create a simple token (userId:timestamp encoded in base64)
    // In a production app, you would use a proper JWT library
    const userId = user._id.toString();
    const timestamp = Date.now();
    const tokenData = `${userId}:${timestamp}`;
    const token = Buffer.from(tokenData).toString('base64');
    
    // Prepare safe user data
    const { password: _, ...userData } = user;
    
    // Ensure _id is a string
    userData._id = userData._id.toString();
    
    // Return the token and user data
    return NextResponse.json({
      success: true,
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('[API] Login error:', error);
    
    return NextResponse.json(
      { error: 'Login failed', details: error.message },
      { status: 500 }
    );
  }
} 