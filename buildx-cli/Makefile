.PHONY: build install run test lint clean format

BINARY := buildx-cli
MODULE := github.com/hitzhangjie/buildx/buildx-cli
VERSION ?= dev
BUILD_MODE ?= DEBUG
GOIMPORTS := go run golang.org/x/tools/cmd/goimports@latest

VERSION_LDFLAGS := -X $(MODULE)/version.Version=$(VERSION)
ifeq ($(BUILD_MODE),RELEASE)
LDFLAGS := -s -w $(VERSION_LDFLAGS)
else
LDFLAGS := $(VERSION_LDFLAGS)
endif

build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) ./cmd/buildx-cli

install:
	go install -ldflags "$(LDFLAGS)" ./cmd/buildx-cli

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
