#!/bin/bash

cd $(dirname $0)
echo In $PWD

mkdir -p tmp
rm -rf tmp/*
mkdir -p dist
mkdir -p tmp/maps

cp -r appserver default metadata static README.md tmp/maps/

VERSION=$(cat default/app.conf | grep "version =" | sed -e 's/version = //g')
DEST_FILENAME="maps-$VERSION-$(git rev-parse --short HEAD).spl"
echo $DEST_FILENAME

cd tmp

COPYFILE_DISABLE=1 tar cvfz ../dist/$DEST_FILENAME --exclude='metadata/local.meta' --exclude='.*' --exclude='*.pxm' maps

# Clean up tmp directory
rm -rf *