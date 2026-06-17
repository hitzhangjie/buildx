.PHONY: build install run test lint clean dev docker

BINARY := buildx-server
MODULE := github.com/hitzhangjie/buildx/buildx-server
VERSION ?= dev
LDFLAGS := -s -w -X $(MODULE)/internal/version.Version=$(VERSION)

build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) .

install:
	go install -ldflags "$(LDFLAGS)" .

run: build
	./bin/$(BINARY) server

dev:
	go run . server --dev

test:
	go test ./...

lint:
	go vet ./...
	go fmt ./...

clean:
	rm -rf bin/ dist/

docker:
	docker build -t buildx-server:$(VERSION) -f deploy/docker/Dockerfile .
