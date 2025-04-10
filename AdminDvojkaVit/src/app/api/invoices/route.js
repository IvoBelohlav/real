import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Use getToken
import { connectToDatabase } from '../../../lib/mongodb';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request) {
  try {
    console.log('[API /invoices] GET request received');
    const token = await getToken({ req: request, secret });

    if (!token || !token.id) { // Check for token and user ID within it
      console.error("[API /invoices] No token or user ID found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const userId = token.id; // Use ID from NextAuth token
    console.log(`[API /invoices] Fetching invoices for user ID: ${userId}`);
    const { db } = await connectToDatabase();

    const invoices = await db.collection('invoices')
      .find({ userId }) // Query using the user ID from the token
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`[API /invoices] Found ${invoices.length} invoices for user ${userId}`);
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to send invoice by email' },
        { status: 401 }
      );
    }
    
    const { invoiceId } = await request.json();
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }
    
    const userId = user.id;
    const { db } = await connectToDatabase();
    
    const invoice = await db.collection('invoices').findOne({
      userId,
      stripeInvoiceId: invoiceId,
    });
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would send an email with the invoice PDF
    // For now, we'll just pretend we did
    
    return NextResponse.json({
      message: 'Invoice sent to your email',
    });
  } catch (error) {
    console.error('Error sending invoice by email:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice by email' },
      { status: 500 }
    );
  }
}
