import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('[API] Register endpoint called');
    
    // Parse the request body
    const userData = await request.json();
    console.log('[API] Register data received:', { 
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      company: userData.company || 'Not provided'
    });
    
    // Basic validation
    if (!userData.email || !userData.password) {
      console.log('[API] Register validation failed: Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const { db } = await connectToDatabase();
    
    // Check if the email already exists
    const existingUser = await db.collection('users').findOne({ email: userData.email });
    if (existingUser) {
      console.log('[API] Register failed: Email already exists');
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Prepare user data for database
    const newUser = {
      email: userData.email,
      name: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : userData.email.split('@')[0],
      firstName: userData.firstName,
      lastName: userData.lastName, 
      company: userData.company || null,
      password: hashedPassword,
      subscription_status: 'inactive',
      subscription_tier: 'free',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Insert the new user
    const result = await db.collection('users').insertOne(newUser);
    console.log('[API] Register success: User created with ID:', result.insertedId);
    
    // Return success response (omit sensitive data)
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertedId.toString(),
        email: newUser.email,
        name: newUser.name
      }
    });
    
  } catch (error) {
    console.error('[API] Register error:', error);
    
    return NextResponse.json(
      { error: 'Failed to register user', details: error.message },
      { status: 500 }
    );
  }
} 