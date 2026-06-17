.PHONY: build run test lint clean dev docker

BINARY_SERVER := synapse
VERSION       ?= dev
LDFLAGS       := -s -w -X github.com/hitzhangjie/buildx/synapse/internal/version.Version=$(VERSION)

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
	docker build -t synapse:$(VERSION) -f deploy/docker/Dockerfile .
