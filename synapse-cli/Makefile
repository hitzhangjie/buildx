.PHONY: build run test lint clean format

BINARY := cli
MODULE := github.com/hitzhangjie/buildx/synapse-cli
VERSION ?= dev
LDFLAGS := -s -w -X $(MODULE)/version.Version=$(VERSION)
GOIMPORTS := go run golang.org/x/tools/cmd/goimports@latest

build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) ./cmd/cli

run: build
	./bin/$(BINARY) version

test:
	go test ./...

format:
	$(GOIMPORTS) -local $(MODULE) -w .

lint:
	go vet ./...
	$(MAKE) format

clean:
	rm -rf bin/
