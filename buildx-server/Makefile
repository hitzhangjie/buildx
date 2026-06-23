.PHONY: build install run test lint clean format dev docker web sync-web

BINARY := buildx-server
MODULE := github.com/hitzhangjie/buildx/buildx-server
VERSION ?= dev
BUILD_MODE ?= DEBUG
SKIP_WEB ?=
GOIMPORTS := go run golang.org/x/tools/cmd/goimports@latest
WEB_EMBED := internal/server/webdist

VERSION_LDFLAGS := -X $(MODULE)/internal/version.Version=$(VERSION)
ifeq ($(BUILD_MODE),RELEASE)
LDFLAGS := -s -w $(VERSION_LDFLAGS)
else
LDFLAGS := $(VERSION_LDFLAGS)
endif

web:
	$(MAKE) -C ../buildx-web build BUILD_MODE=$(BUILD_MODE)
	bash ../buildx-web/scripts/sync-embed.sh

sync-web:
	bash ../buildx-web/scripts/sync-embed.sh

build:
ifneq ($(SKIP_WEB),1)
	$(MAKE) web
endif
	go build -mod=vendor -ldflags "$(LDFLAGS)" -o bin/$(BINARY) .

install:
ifneq ($(SKIP_WEB),1)
	$(MAKE) web
endif
	go install -ldflags "$(LDFLAGS)" .

run: build
	./bin/$(BINARY) serve

dev:
	go run . serve --dev

test:
	go test ./... -count=1

cover:
	go test ./... -cover -coverprofile=cover.out -count=1
	go tool cover -func=cover.out | tail -1

cover-html:
	go test ./... -cover -coverprofile=cover.out -count=1
	go tool cover -html=cover.out

race:
	go test ./... -race -count=1

format:
	$(GOIMPORTS) -local $(MODULE) -w .

lint:
	go vet ./...
	go fmt ./...

clean:
	rm -rf bin/ dist/

docker: web
	docker build -t buildx-server:$(VERSION) -f deploy/docker/Dockerfile .
