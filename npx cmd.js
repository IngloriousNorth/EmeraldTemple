npm install

browserify main.js -p esmify -o "./src/bundle.js" //public MVC bundle

npx esbuild nano.js --bundle --minify --format=esm --platform=node --target=esnext --outfile=src/nano.js 

npm run build //builds Gate.bundle.enc