#!/bin/bash

set -e

export FLYCTL_INSTALL="/Users/alexandermittet/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

echo "🚀 Starting deployment process..."
echo ""

# Check if logged into Fly
if ! fly auth whoami &>/dev/null; then
    echo "❌ Not logged into Fly.dev"
    echo "Please run: fly auth login"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Logged into Fly.dev"
echo ""

# Backend deployment
echo "📦 Deploying backend to Fly.dev..."
cd backend

# Check if app exists
if ! fly apps list | grep -q "catscribe-backend"; then
    echo "Creating Fly app..."
    fly apps create catscribe-backend
fi

# Check if volume exists
if ! fly volumes list | grep -q "catscribe_data"; then
    echo "Creating persistent volume..."
    fly volumes create catscribe_data --size 10 --region iad
fi

echo ""
echo "⚠️  IMPORTANT: Set these secrets before deploying:"
echo "   fly secrets set REDIS_URL='your-upstash-redis-url'"
echo "   fly secrets set API_KEY='generate-a-random-secret-key'"
echo "   fly secrets set ALLOWED_ORIGINS='https://your-app.vercel.app'"
echo ""
read -p "Have you set the secrets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the secrets first, then run this script again."
    exit 1
fi

echo "Deploying backend..."
fly deploy

BACKEND_URL=$(fly status -a catscribe-backend | grep "Hostname" | awk '{print $2}' || echo "catscribe-backend.fly.dev")
echo ""
echo "✅ Backend deployed at: https://${BACKEND_URL}"
echo ""

# Frontend deployment
cd ../frontend
echo "🎨 Deploying frontend to Vercel..."
echo ""
echo "⚠️  Make sure you've set these environment variables in Vercel:"
echo "   NEXT_PUBLIC_API_URL=https://${BACKEND_URL}"
echo "   NEXT_PUBLIC_API_KEY=(same as backend API_KEY)"
echo "   NEXT_PUBLIC_FRONTEND_URL=(your Vercel URL)"
echo "   BACKEND_URL=https://${BACKEND_URL}"
echo "   API_KEY=(same as backend API_KEY)"
echo "   STRIPE_SECRET_KEY=(your Stripe secret key)"
echo "   STRIPE_WEBHOOK_SECRET=(your Stripe webhook secret)"
echo ""

vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up Stripe webhook pointing to your Vercel URL/api/webhook"
echo "2. Test the app at your Vercel URL"
echo "3. Set up cleanup cron job (see DEPLOYMENT.md)"
