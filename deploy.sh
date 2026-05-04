#!/bin/bash
set -e

echo "Building production bundle..."
npx ng build --configuration production --base-href /Angular-Resume/

echo "Copying index.html → 404.html for SPA routing..."
cp dist/live-resume/index.html dist/live-resume/404.html

echo "Deploying to gh-pages branch..."
cd dist/live-resume
git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy production build $(date '+%Y-%m-%d %H:%M:%S')"
git push -f git@github.com:Emmanuel1017/Angular-Resume.git gh-pages

echo "Done! Live at https://emmanuel1017.github.io/Angular-Resume/"
