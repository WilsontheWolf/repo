FROM node:16
WORKDIR /app
RUN apt-get update -y && \
    apt-get autoremove -y && \
    apt-get install --no-install-recommends apt-utils -y && \
    rm -rf /var/lib/apt/lists/*
USER node:node
ENTRYPOINT [ "/bin/bash", "-c"]
