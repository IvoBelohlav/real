import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;
// Determine the base URL for the widget script
const widgetScriptBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request) {
  try {
    console.log('[API /widget/embed-code] Request received');
    const token = await getToken({ req: request, secret });

    if (!token) {
      console.error("[API /widget/embed-code] No token found in session");
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // Check subscription status and API key from the token
    const subscriptionStatus = token.subscription_status;
    const apiKey = token.api_key;

    if (subscriptionStatus !== 'active') {
      console.warn(`[API /widget/embed-code] User ${token.email} has inactive subscription (${subscriptionStatus}). Cannot provide embed code.`);
      return NextResponse.json(
        { error: 'Active subscription required to get embed code.' },
        { status: 403 } // Forbidden
      );
    }

    if (!apiKey) {
       console.error(`[API /widget/embed-code] User ${token.email} has active subscription but no API key found in token.`);
       // This might indicate an issue with webhook processing or token population
       return NextResponse.json(
         { error: 'API Key not found. Please contact support.' },
         { status: 500 }
       );
    }

    console.log(`[API /widget/embed-code] Generating embed code for user ${token.email} with API key ${apiKey.substring(0, 5)}...`);

    // Generate HTML and JavaScript code for embedding the widget
    const html = `<!-- Widget Container -->
<div id="lermo-widget-container"></div>`; // Use a more specific ID

    // Construct the full script URL
    const widgetScriptUrl = `${widgetScriptBaseUrl}/widget.js`;

    const javascript = `<!-- Lermo Widget Script -->
<script src="${widgetScriptUrl}" defer></script>
<script>
  window.lermoSettings = {
    apiKey: "${apiKey}",
    containerId: "lermo-widget-container"
    // theme: "light" // Optional: Add theme or other config from user settings if needed
  };
</script>`;

    // Return the embed code
    return NextResponse.json({
      html,
      javascript,
      apiKey: apiKey, // Also return the key directly for easy copying if needed
      instructions: `
1. Add the HTML code (div with id="lermo-widget-container") where you want the widget button to appear on your page.
2. Place the JavaScript code (both script tags) just before the closing </body> tag on your website pages.
3. The widget will load automatically using your unique API key: ${apiKey.substring(0, 5)}...
`
    });

  } catch (error) {
    console.error('Error generating embed code:', error);
    return NextResponse.json(
      { error: 'Failed to generate embed code' },
      { status: 500 }
    );
  }
}
