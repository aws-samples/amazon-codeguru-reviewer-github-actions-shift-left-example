# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM amazoncorretto:11-alpine

ENV VERSION="1.2.1"

VOLUME /tmp

COPY "agents/codeguru-profiler-java-agent-standalone-${VERSION}.jar" "agent.jar"
COPY "build/libs/bookworm-thumbnail-generator-service-all.jar" "app.jar"

ENTRYPOINT [ "java",                                                                                                  \
             "-Djava.security.egd=file:/dev/./urandom",                                                               \
             "-javaagent:/agent.jar=profilingGroupName:BookwormThumbnailGeneratorService,heapSummaryEnabled:true",    \
             "-jar",                                                                                                  \
             "/app.jar" ]
