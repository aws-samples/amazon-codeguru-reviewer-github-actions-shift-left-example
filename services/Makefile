# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

all: install

install: bkwrm-upload-cover bkwrm-thumbnail-generator-service

clean: clean-bkwrm-upload-cover clean-bkwrm-thumbnail-generator-service

bkwrm-upload-cover:
	cd bookworm-upload-cover && pip install -r requirements.txt --target ./package
	cd bookworm-upload-cover && cp *.py ./package
	cd bookworm-upload-cover && cp *.txt ./package
	cd bookworm-upload-cover/package && zip -r ../bookworm-upload-cover.zip .

clean-bkwrm-upload-cover:
	cd bookworm-upload-cover && rm -rf ./package
	cd bookworm-upload-cover && rm -f bookworm-upload-cover.zip

bkwrm-thumbnail-generator-service:
	cd bookworm-thumbnail-generator-service && ./gradlew uberJar

clean-bkwrm-thumbnail-generator-service:
	cd bookworm-thumbnail-generator-service && ./gradlew clean
