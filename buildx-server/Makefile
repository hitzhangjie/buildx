.PHONY: build install run test lint clean format dev docker web sync-web

BINARY := buildx-server
MODULE := github.com/hitzhangjie/buildx/buildx-server
VERSION ?= dev
SKIP_WEB ?=
LDFLAGS := -s -w -X $(MODULE)/internal/version.Version=$(VERSION)
GOIMPORTS := go run golang.org/x/tools/cmd/goimports@latest
WEB_EMBED := internal/server/webdist

web:
	$(MAKE) -C ../buildx-web build
	bash ../buildx-web/scripts/sync-embed.sh

sync-web:
	bash ../buildx-web/scripts/sync-embed.sh

build:
ifneq ($(SKIP_WEB),1)
	$(MAKE) web
endif
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) .

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
	go test ./...

format:
	$(GOIMPORTS) -local $(MODULE) -w .

lint:
	go vet ./...
	go fmt ./...

clean:
	rm -rf bin/ dist/

docker: web
	docker build -t buildx-server:$(VERSION) -f deploy/docker/Dockerfile .
