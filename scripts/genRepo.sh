#!/usr/bin/env bash
# Hey! This script is a modied version of the one from repo.me. 
# Checkout repo.me here https://github.com/revisitable/repo.me

if [[ "$OSTYPE" == "linux"* ]]; then # Linux usage
    cd "$(dirname "$0")" || exit
    cd ../build

    gzip -c9 Packages > Packages.gz
    xz -c9 Packages > Packages.xz
    zstd -c19 Packages > Packages.zst
    bzip2 -c9 Packages > Packages.bz2
    
    apt-ftparchive release -c ../buildPackages/repo.conf . > Release

    elif [[ "$(uname)" == Darwin ]] && [[ "$(uname -p)" == i386 ]]; then # macOS usage
    cd "$(dirname "$0")" || exit
    
    echo "Checking for Homebrew, wget, xz, & zstd..."
    if test ! "$(which brew)"; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
    fi
    brew list --verbose wget || brew install wget
    brew list --verbose xz || brew install xz
    brew list --verbose zstd || brew install zstd
    clear
    
    echo "apt-ftparchive compiled by @Diatrus" # credits to Hayden!
    wget -q -nc https://apt.procurs.us/apt-ftparchive # assuming Homebrew is already installed, download apt-ftparchive via wget
    sudo chmod 751 ./apt-ftparchive # could change this to be pointed in documentation, but people don't like to read what needs READING. i'll think about it later.
    
    gzip -c9 Packages > Packages.gz
    xz -c9 Packages > Packages.xz
    zstd -c19 Packages > Packages.zst
    bzip2 -c9 Packages > Packages.bz2
    
    ./apt-ftparchive release -c ../buildPackages/repo.conf . > Release

    elif [[ "$(uname -r)" == *Microsoft ]]; then # WSL 1 usage of repo.me
    cd "$(dirname "$0")" || exit
    cd ../build

    gzip -c9 Packages > Packages.gz
    xz -c9 Packages > Packages.xz
    zstd -c19 Packages > Packages.zst
    bzip2 -c9 Packages > Packages.bz2

    apt-ftparchive release -c ../buildPackages/repo.conf . > Release

    elif [[ "$(uname -r)" == *microsoft-standard ]]; then # WSL 2 usage of repo.me
    cd "$(dirname "$0")" || exit
    
    gzip -c9 Packages > Packages.gz
    xz -c9 Packages > Packages.xz
    zstd -c19 Packages > Packages.zst
    bzip2 -c9 Packages > Packages.bz2
    
    apt-ftparchive release -c ../buildPackages/repo.conf . > Release

    elif [[ "$(uname)" == Darwin ]] && [[ "$(uname -p)" != i386 ]]; then # iOS/iPadOS usage
    cd "$(dirname "$0")" || exit
    cd ../build
    echo "Checking for apt-ftparchive..."
    if test ! "$(apt-ftparchive)"; then
        apt update && apt install apt-utils -y
    fi

    gzip -c9 Packages > Packages.gz
    xz -c9 Packages > Packages.xz
    zstd -c19 Packages > Packages.zst
    bzip2 -c9 Packages > Packages.bz2

    apt-ftparchive release -c ../buildPackages/repo.conf . > Release
else
    echo "Running an unsupported operating system...?"
fi
