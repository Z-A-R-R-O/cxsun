FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    git \
    nano \
    sudo \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY .container/entrypoint.sh /usr/local/bin/cxsun-entrypoint
RUN chmod +x /usr/local/bin/cxsun-entrypoint \
  && mkdir -p /workspace \
  && chmod 777 /workspace

EXPOSE 6001 6010

ENTRYPOINT ["/usr/local/bin/cxsun-entrypoint"]
