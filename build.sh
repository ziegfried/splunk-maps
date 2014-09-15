#!/bin/bash

cd $(dirname $0)
echo In $PWD
VERSION=$(cat default/app.conf | grep "version =" | sed -e 's/version = //g')
DEST_FILENAME="maps-$VERSION-$(date +%Y%m%d).spl"
echo $DEST_FILENAME

cd ..

COPYFILE_DISABLE=1 tar cvfz $DEST_FILENAME --exclude='*.iml' --exclude='.idea' --exclude='.*' --exclude='*.pxm' --exclude='.git/*' maps