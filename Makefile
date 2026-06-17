.PHONY: all build clean install uninstall test format lint
.PHONY: build-cli build-server clean-cli clean-server
.PHONY: install-cli install-server test-cli test-server format-cli format-server

VERSION ?= dev

GOBIN := $(shell go env GOBIN)
ifeq ($(GOBIN),)
GOBIN := $(join $(shell go env GOPATH),/bin)
endif

INSTALL_BINARIES := buildx-cli buildx-server

.DEFAULT_GOAL := build

all: build

build: build-cli build-server

build-cli:
	$(MAKE) -C buildx-cli build VERSION=$(VERSION)

build-server:
	$(MAKE) -C buildx-server build VERSION=$(VERSION)

clean: clean-cli clean-server

clean-cli:
	$(MAKE) -C buildx-cli clean

clean-server:
	$(MAKE) -C buildx-server clean

install: install-cli install-server

install-cli:
	$(MAKE) -C buildx-cli install VERSION=$(VERSION)

install-server:
	$(MAKE) -C buildx-server install VERSION=$(VERSION)

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
