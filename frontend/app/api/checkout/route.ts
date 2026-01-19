import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PRICING_CONFIG } from '../../config/pricing';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

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

    const package_ = PRICING_CONFIG.packages.find(p => p.id === packageId);
    if (!package_) {
      return NextResponse.json(
        { detail: 'Invalid package' },
        { status: 400 }
      );
    }

    const isAdminEmail = email.toLowerCase() === PRICING_CONFIG.adminEmail;
    const priceInSmallestUnit = (amount: number) => amount * 100; // øre for DKK, cents for EUR/USD
    const finalPrice = isAdminEmail ? priceInSmallestUnit(PRICING_CONFIG.adminPrice) : priceInSmallestUnit(package_.price);
    const baseName = `${package_.minutes} Minutes - ${package_.price} ${PRICING_CONFIG.currencyDisplay}`;
    const productName = isAdminEmail ? `${baseName} (Admin Price)` : baseName;

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
            currency: PRICING_CONFIG.currency,
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
