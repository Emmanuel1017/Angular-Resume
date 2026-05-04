#!/bin/bash
set -e

REPO="git@github.com:Emmanuel1017/Angular-Resume.git"
PROJECT_NAME="live-resume"
BASE_HREF="/Angular-Resume/"

echo "Using Node:"
node -v
npm -v

echo "Cleaning old build..."
rm -rf dist/$PROJECT_NAME

echo "Building Angular production bundle..."
npx ng build --configuration production --base-href=$BASE_HREF

echo "Add SPA fallback (404.html)..."
cp dist/$PROJECT_NAME/index.html dist/$PROJECT_NAME/404.html

echo "Deploying to gh-pages branch..."

cd dist/$PROJECT_NAME

# Initialize temporary repo for deployment
git init
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"

# Push to gh-pages branch
git branch -M gh-pages
git remote add origin $REPO
git push -f origin gh-pages

echo ""
echo "Deployment successful 🚀"
echo "Live URL:"
echo "https://emmanuel1017.github.io/Angular-Resume/"