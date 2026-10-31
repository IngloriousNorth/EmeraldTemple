npm install

browserify main.js -P tinyify -p esmify -o "./src/bundle.js" //public MVC bundle

npx esbuild nano.js --bundle --minify --format=iife --platform=node --outfile=nano.mins.js 

npm run build //builds Gate.bundle.enc