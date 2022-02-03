#! /bin/bash
docker build -t local/repo-builder .
docker run --rm -it -v $PWD:/app local/repo-builder './scripts/docker.sh'