# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /synapse .

# Runtime stage
FROM alpine:3.20
RUN apk add --no-cache git openssh-client ca-certificates tzdata
RUN adduser -D -u 1000 synapse
WORKDIR /app
COPY --from=builder /synapse /app/synapse
COPY web/dist /app/web/dist
USER synapse
EXPOSE 6610 6611
VOLUME ["/data"]
ENV SYNAPSE_DATA_DIR=/data
ENV SYNAPSE_HTTP_ADDR=:6610
ENV SYNAPSE_SSH_ADDR=:6611
ENTRYPOINT ["/app/synapse"]
CMD ["server"]
