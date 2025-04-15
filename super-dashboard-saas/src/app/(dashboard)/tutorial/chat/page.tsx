'use client';

import React from 'react';
import Link from 'next/link'; // Import Link

export default function ChatTutorialPage() {
  // Replace with your actual YouTube video ID for the Chat setup tutorial
  const videoId = "YOUR_YOUTUBE_VIDEO_ID_CHAT"; 

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Návod: Nastavení Chatu</h1>

      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <h2 className="text-xl font-medium text-card-foreground mb-3">Co zahrnuje sekce Chat?</h2>
        <p className="text-muted-foreground mb-4">
          Tato sekce sdružuje všechny funkce související s přímou interakcí a daty zákazníků. Můžete zde procházet historii konverzací, spravovat kontaktní formuláře, produkty, typy podnikání a informace o vašem obchodě.
        </p>
        <p className="text-muted-foreground">
          Efektivní správa těchto dat pomáhá personalizovat interakce a zlepšovat zákaznickou podporu.
        </p>
      </div>

      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <h2 className="text-xl font-medium text-card-foreground mb-4">Video Návod</h2>
        <div className="aspect-w-16 aspect-h-9"> {/* Responsive aspect ratio */}
          {videoId && videoId !== "YOUR_YOUTUBE_VIDEO_ID_CHAT" ? (
            <iframe
              className="rounded w-full h-full" // Ensure full width and height within aspect ratio container
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player - Chat Setup Tutorial"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted rounded text-muted-foreground"> {/* Added fixed height for placeholder */}
              Video návod bude brzy doplněn. (Replace "YOUR_YOUTUBE_VIDEO_ID_CHAT" in the code with your video ID)
            </div>
          )}
        </div>
      </div>

       <div className="bg-card shadow rounded-lg p-6 border border-border">
        <h2 className="text-xl font-medium text-card-foreground mb-3">Kde začít?</h2>
         <p className="text-muted-foreground mb-4">
            Projděte si jednotlivé podsekce v levém menu pod položkou "Chat":
            <ul className="list-disc list-inside mt-2">
                <li><Link href="/conversations" className="text-primary hover:underline">Logy Konverzací</Link></li>
                <li><Link href="/contact-submissions" className="text-primary hover:underline">Kontaktní Formuláře</Link></li>
                <li><Link href="/products" className="text-primary hover:underline">Produkty</Link></li>
                <li><Link href="/business-types" className="text-primary hover:underline">Typy Podnikání</Link></li>
                <li><Link href="/orders" className="text-primary hover:underline">Objednávky</Link></li>
                <li><Link href="/shop-info" className="text-primary hover:underline">Informace o Obchodě</Link></li>
            </ul>
         </p>
         {/* Add more steps or tips here */}
       </div>
    </div>
  );
}
