import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Code } from 'lucide-react';

export default function InstallationHelpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/help/getting-started" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Help Center
        </Link>
        
        <div className="flex items-center mb-6">
          <Code className="w-8 h-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Widget Installation</h1>
        </div>
        
        <div className="prose prose-invert max-w-none bg-card border border-border rounded-lg p-6 shadow-sm">
          <p>
            To add the chat widget to your website, you need to embed a small JavaScript code snippet into your site&apos;s HTML.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Finding Your Code Snippet</h2>
          <p>
            Navigate to the <Link href="/installation" className="text-primary hover:underline">Installation</Link> page from the main dashboard sidebar.
          </p>
          <p>
            On this page, you will find the unique code snippet generated for your account. This snippet includes your API key and instructions for the widget.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">How to Install</h2>
          <ol>
            <li>Copy the entire code snippet provided on the Installation page.</li>
            <li>
              Paste the code snippet into the HTML of your website, just before the closing{' '}
              <code>&lt;/body&gt;</code> tag.
            </li>
            <li>If you are using a website builder (like WordPress, Shopify, Wix, etc.), look for options to add custom code, custom HTML, or footer scripts. Paste the snippet there.</li>
            <li>Save the changes to your website.</li>
          </ol>
          <p>
            Once installed, the chat widget should appear on your website according to the configuration settings you&apos;ve defined.
          </p>
          <p>
            Make sure you have added your website&apos;s domain to the allowed domains list in the <Link href="/domains" className="text-primary hover:underline">Domains</Link> section of the dashboard for the widget to function correctly.
          </p>
          
          {/* Placeholder for video */}
          {/* <div className="mt-8 aspect-video bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">[Video Tutorial Placeholder]</p>
          </div> */}
        </div>
      </div>
    </div>
  );
}