npm install

browserify main.js -p esmify -o "./src/bundle.js"

npx esbuild nano.js --bundle --minify --format=esm --platform=node --target=esnext --outfile=client/src/nano.js

npm run build //use esbuild