const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  mode: 'subscription',
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
  customer: customer.id,
  client_reference_id: String(userId),
  metadata: {
    userId: String(userId),
    userEmail: user.email,
    tier: planName
  }
}); 