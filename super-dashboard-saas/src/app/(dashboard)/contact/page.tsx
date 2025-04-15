'use client';

import React from 'react'; 
import Link from 'next/link'; 

export default function ContactPage() {
  

  return (
    <div className="container mx-auto px-4 py-8 bg-card text-card-foreground rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6 border-b pb-2">Potřebujete pomoct?</h1>

      {/* Changed grid to single column as form is removed */}
      <div className="grid grid-cols-1 gap-12"> 
        {/* Contact Information Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Kontaktní údaje</h2>
          <p className="mb-4 text-muted-foreground">
            Máte dotaz nebo potřebujete poradit? Neváhejte nás kontaktovat jedním z níže uvedených způsobů.
          </p>
          <div className="space-y-3">
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:podpora@superdash.cz" className="text-primary hover:underline">
                podpora@superdash.cz
              </a>
            </p>
            <p>
              <strong>Telefon:</strong>{' '}
              <a href="tel:+420123456789" className="text-primary hover:underline">
                +420 123 456 789
              </a>
              <span className="text-sm text-muted-foreground ml-2">(Po-Pá 9:00 - 17:00)</span>
            </p>
            {/* Add other contact methods if needed */}
          </div>
        </div>

        {/* Contact Form Section Removed */}
      </div>
    </div>
  );
}
