all:
	npm run start --open

build:
	npm run build
	echo "/*    /index.html   200" > ./dist/badminton-matching-app/browser/_redirects