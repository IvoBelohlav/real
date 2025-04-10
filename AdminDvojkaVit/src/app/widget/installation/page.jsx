import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { generateWidgetInstallationCode } from '@/lib/widget-utils';
import styles from './Installation.module.css';

export const metadata = {
  title: 'Widget Installation - Dvojkavit Dashboard',
  description: 'Install the Dvojkavit chat widget on your website',
};

async function fetchApiKey() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/api-keys`, {
      headers: {
        'Cookie': `next-auth.session-token=${session.user.token}`,
      },
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.apiKeys && data.apiKeys.length > 0 ? data.apiKeys[0].key : null;
  } catch (error) {
    console.error('Error fetching API key:', error);
    return null;
  }
}

export default async function InstallationPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const apiKey = await fetchApiKey();
  const installationCode = apiKey 
    ? generateWidgetInstallationCode(apiKey) 
    : '';

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Widget Installation</h1>
      
      <div className={styles.infoBox}>
        <h2 className={styles.subtitle}>Get your widget up and running</h2>
        <p>
          Copy and paste the code below into your website to add the Dvojkavit chat widget. 
          Place it right before the closing <code>&lt;/body&gt;</code> tag for best performance.
        </p>
      </div>

      {apiKey ? (
        <div className={styles.codeContainer}>
          <div className={styles.codeHeader}>
            <span>Installation Code</span>
            <button 
              className={styles.copyButton} 
              onClick={() => {
                navigator.clipboard.writeText(installationCode);
                document.getElementById('copyMessage').style.opacity = 1;
                setTimeout(() => {
                  document.getElementById('copyMessage').style.opacity = 0;
                }, 2000);
              }}
            >
              Copy
            </button>
          </div>
          <pre className={styles.codeBlock}>
            <code>{installationCode}</code>
          </pre>
          <div id="copyMessage" className={styles.copyMessage}>Code copied to clipboard!</div>
        </div>
      ) : (
        <div className={styles.noApiKeyMessage}>
          <p>You need to generate an API key first.</p>
          <a href="/api-keys" className={styles.button}>Go to API Keys</a>
        </div>
      )}

      <div className={styles.additionalInfo}>
        <h2 className={styles.subtitle}>Additional Configuration</h2>
        <p>
          You can further customize your widget appearance and behavior in the 
          <a href="/widget"> Widget Configuration</a> section.
        </p>
        <p>
          For security reasons, you can restrict the domains where your widget can be used in the 
          <a href="/widget/domains"> Domain Management</a> section.
        </p>
      </div>
    </div>
  );
} 