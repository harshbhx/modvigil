#!/bin/bash
# ModVigil Upload and Test Script
# Run this to deploy and verify everything works

set -e  # Exit on error

echo "🚀 ModVigil Deployment Script"
echo "=============================="
echo ""

# Step 1: Verify build
echo "Step 1: Verifying TypeScript build..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ Build PASSED"
else
    echo "❌ Build FAILED - Fix errors before uploading"
    exit 1
fi
echo ""

# Step 2: Login to Devvit
echo "Step 2: Logging into Devvit..."
devvit login
echo ""

# Step 3: Upload
echo "Step 3: Uploading to Reddit..."
devvit upload
echo ""

# Step 4: List apps
echo "Step 4: Verifying upload..."
devvit list
echo ""

echo "✅ Upload complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Run: devvit playtest r/your_test_subreddit"
echo "2. Remove a post to test data pipeline"
echo "3. Open dashboard and verify data appears"
echo "4. Run all 5 critical tests from MASTER_EXECUTION_PLAN.md"
echo ""
echo "🎬 After testing, record your demo video!"
