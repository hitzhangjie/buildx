#!/bin/bash

rm -rf ./data/

export BUILDX_HTTP_ADDR=0.0.0.0:9910
export BUILDX_SSH_ADDR=0.0.0.0:9911

export BUILDX_INITIAL_USER=zhangjie
export BUILDX_INITIAL_PASSWORD=zhangjie
export BUILDX_INITIAL_EMAIL=hit.zhangjie@gmail.com

buildx-server serve --dev
