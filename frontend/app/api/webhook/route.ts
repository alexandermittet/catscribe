import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { detail: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const fingerprint = session.metadata?.fingerprint;
    const email = session.metadata?.email;
    const credits = parseFloat(session.metadata?.credits || '0');

    if (!fingerprint || !email || !credits) {
      return NextResponse.json(
        { detail: 'Missing metadata in session' },
        { status: 400 }
      );
    }

    // Update credits in backend
    try {
      const formData = new FormData();
      formData.append('fingerprint', fingerprint);
      formData.append('email', email);
      formData.append('credits', credits.toString());

      const response = await fetch(`${BACKEND_URL}/credits/add`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        console.error('Failed to update credits:', await response.text());
        return NextResponse.json(
          { detail: 'Failed to update credits' },
          { status: 500 }
        );
      }
    } catch (error: any) {
      console.error('Error updating credits:', error);
      return NextResponse.json(
        { detail: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
