# VISÃO Makefile
.PHONY: dev build test lint

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

install:
	npm install

clean:
	rm -rf dist node_modules

