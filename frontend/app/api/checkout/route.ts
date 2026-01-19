import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Credit packages
const CREDIT_PACKAGES = [
  { id: 'small', credits: 50, price: 500, name: '50 Credits - $5' },
  { id: 'medium', credits: 120, price: 1000, name: '120 Credits - $10' },
  { id: 'large', credits: 300, price: 2000, name: '300 Credits - $20' },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fingerprint, email, packageId } = body;

    if (!fingerprint || !email || !packageId) {
      return NextResponse.json(
        { detail: 'Missing required fields' },
        { status: 400 }
      );
    }

    const package_ = MINUTES_PACKAGES.find(p => p.id === packageId);
    if (!package_) {
      return NextResponse.json(
        { detail: 'Invalid package' },
        { status: 400 }
      );
    }

    // Special pricing for admin email
    const isAdminEmail = email.toLowerCase() === 'admin@admitted.dk';
    const finalPrice = isAdminEmail ? 100 : package_.price; // $1.00 for admin, regular price otherwise
    const productName = isAdminEmail ? `${package_.name} (Admin Price)` : package_.name;

    // Use hardcoded production URL - most reliable approach
    const frontendUrl = 'https://frontend-taupe-six-42.vercel.app';
    
    const successUrl = `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}?canceled=true`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: `${package_.minutes} transcription minutes`,
            },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        fingerprint,
        email,
        minutes: package_.minutes.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
