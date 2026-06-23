.PHONY: all build clean install uninstall test format lint
.PHONY: build-cli build-server build-web clean-cli clean-server clean-web
.PHONY: install-cli install-server test-cli test-server format-cli format-server

VERSION ?= dev
BUILD_MODE ?= DEBUG
SKIP_WEB ?=

# DEBUG: keep symbols, web source maps. RELEASE: stripped Go binaries, minified web.
ifeq ($(filter $(BUILD_MODE),DEBUG RELEASE),)
$(error BUILD_MODE must be DEBUG or RELEASE, got '$(BUILD_MODE)')
endif

export VERSION
export BUILD_MODE
export SKIP_WEB

GOBIN := $(shell go env GOBIN)
ifeq ($(GOBIN),)
GOBIN := $(join $(shell go env GOPATH),/bin)
endif

INSTALL_BINARIES := buildx-cli buildx-server

.DEFAULT_GOAL := build

all: build

build: build-cli build-server

build-web:
	$(MAKE) -C buildx-web build BUILD_MODE=$(BUILD_MODE)
	bash buildx-web/scripts/sync-embed.sh

build-cli:
	$(MAKE) -C buildx-cli build VERSION=$(VERSION) BUILD_MODE=$(BUILD_MODE)

build-server:
ifneq ($(SKIP_WEB),1)
	$(MAKE) build-web
endif
	$(MAKE) -C buildx-server build VERSION=$(VERSION) BUILD_MODE=$(BUILD_MODE) SKIP_WEB=1

clean: clean-cli clean-server clean-web

clean-cli:
	$(MAKE) -C buildx-cli clean

clean-server:
	$(MAKE) -C buildx-server clean

clean-web:
	$(MAKE) -C buildx-web clean

install: install-cli install-server

install-cli:
	$(MAKE) -C buildx-cli install VERSION=$(VERSION) BUILD_MODE=$(BUILD_MODE)

install-server:
ifneq ($(SKIP_WEB),1)
	$(MAKE) build-web
endif
	$(MAKE) -C buildx-server install VERSION=$(VERSION) BUILD_MODE=$(BUILD_MODE) SKIP_WEB=1

uninstall:
	rm -f $(addprefix $(GOBIN)/,$(INSTALL_BINARIES))

test: test-cli test-server

test-cli:
	$(MAKE) -C buildx-cli test

test-server:
	$(MAKE) -C buildx-server test

format: format-cli format-server

format-cli:
	$(MAKE) -C buildx-cli format

format-server:
	$(MAKE) -C buildx-server format

lint:
	$(MAKE) -C buildx-cli lint
	$(MAKE) -C buildx-server lint
