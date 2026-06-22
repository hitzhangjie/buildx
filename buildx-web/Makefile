.PHONY: install build clean dev sync-onedev-assets

install:
	npm ci

sync-onedev-assets:
	bash scripts/sync-onedev-assets.sh

build: sync-onedev-assets install
	npm run build

dev: sync-onedev-assets
	npm run dev

clean:
	rm -rf dist node_modules public/onedev public/~icon public/~img
