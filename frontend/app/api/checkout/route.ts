import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

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

    const package_ = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!package_) {
      return NextResponse.json(
        { detail: 'Invalid package' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: package_.name,
              description: `${package_.credits} transcription credits`,
            },
            unit_amount: package_.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}?canceled=true`,
      metadata: {
        fingerprint,
        email,
        credits: package_.credits.toString(),
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
