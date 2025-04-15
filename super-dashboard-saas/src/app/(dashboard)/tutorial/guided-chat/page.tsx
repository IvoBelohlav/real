'use client';

import React from 'react';
import Link from 'next/link'; // Import Link

export default function GuidedChatTutorialPage() {
  // Replace with your actual YouTube video ID for the Guided Chat tutorial
  const videoId = "YOUR_YOUTUBE_VIDEO_ID_GUIDED"; 

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Návod: Nastavení Průvodce (Guided Chat)</h1>

      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <h2 className="text-xl font-medium text-card-foreground mb-3">Co je Průvodce?</h2>
        <p className="text-muted-foreground mb-4">
          Průvodce (Guided Chat) vám umožňuje vytvářet předdefinované konverzační scénáře. Můžete tak vést zákazníky krok za krokem k cíli, například k vytvoření objednávky, zodpovězení specifického dotazu nebo sběru potřebných informací.
        </p>
        <p className="text-muted-foreground">
          Tento režim je ideální pro automatizaci opakujících se úkolů a zajištění konzistentní zákaznické zkušenosti.
        </p>
      </div>

      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <h2 className="text-xl font-medium text-card-foreground mb-4">Video Návod</h2>
        <div className="aspect-w-16 aspect-h-9"> {/* Responsive aspect ratio */}
          {videoId && videoId !== "YOUR_YOUTUBE_VIDEO_ID_GUIDED" ? (
            <iframe
              className="rounded w-full h-full" // Ensure full width and height within aspect ratio container
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player - Guided Chat Tutorial"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted rounded text-muted-foreground"> {/* Added fixed height for placeholder */}
              Video návod bude brzy doplněn. (Replace "YOUR_YOUTUBE_VIDEO_ID_GUIDED" in the code with your video ID)
            </div>
          )}
        </div>
      </div>

       <div className="bg-card shadow rounded-lg p-6 border border-border">
        <h2 className="text-xl font-medium text-card-foreground mb-3">Kde začít?</h2>
         <p className="text-muted-foreground mb-4">
            Pro vytvoření nebo úpravu scénářů přejděte do sekce <Link href="/guided-chat" className="text-primary hover:underline">Editor Průvodce</Link> v levém menu.
         </p>
         {/* Add more steps or tips here */}
       </div>
    </div>
  );
}
