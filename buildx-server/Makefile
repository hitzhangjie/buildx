.PHONY: build install run test lint clean format dev docker

BINARY := buildx-server
MODULE := github.com/hitzhangjie/buildx/buildx-server
VERSION ?= dev
LDFLAGS := -s -w -X $(MODULE)/internal/version.Version=$(VERSION)
GOIMPORTS := go run golang.org/x/tools/cmd/goimports@latest

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

format:
	$(GOIMPORTS) -local $(MODULE) -w .

lint:
	go vet ./...
	go fmt ./...

clean:
	rm -rf bin/ dist/

docker:
	docker build -t buildx-server:$(VERSION) -f deploy/docker/Dockerfile .
