# syntax=docker/dockerfile:1.7

FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && adduser -S -G app app && \
    mkdir -p /data && chown app:app /data
WORKDIR /app
COPY --from=build /out/server /app/server
COPY templates /app/templates
COPY static /app/static
USER app
EXPOSE 8080
ENV DB_PATH=/data/portfolio.db PORT=8080
ENTRYPOINT ["/app/server"]
