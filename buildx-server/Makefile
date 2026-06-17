.PHONY: build run test lint clean dev docker

BINARY_SERVER := buildx-server
VERSION       ?= dev
LDFLAGS       := -s -w -X github.com/hitzhangjie/buildx/buildx-server/internal/version.Version=$(VERSION)

build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY_SERVER) .

run: build
	./bin/$(BINARY_SERVER) server

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
