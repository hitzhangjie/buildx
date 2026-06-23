# Build stage — web UI is go:embed'd via internal/server/webdist (run `make web` first).
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /buildx-server .

# Runtime stage
FROM alpine:3.20
RUN apk add --no-cache git openssh-client ca-certificates tzdata
RUN adduser -D -u 1000 buildx
WORKDIR /app
COPY --from=builder /buildx-server /app/buildx-server
USER buildx
EXPOSE 9910 9911
VOLUME ["/data"]
ENV BUILDX_DATA_DIR=/data
ENV BUILDX_HTTP_ADDR=:9910
ENV BUILDX_SSH_ADDR=:9911
ENTRYPOINT ["/app/buildx-server"]
CMD ["serve"]
