all: get-agent

REPOSITORY="https://d1osg35nybn3tt.cloudfront.net/com/amazonaws/codeguru-profiler-java-agent-standalone"
VERSION="1.2.1"

get-agent:
	curl "${REPOSITORY}/${VERSION}/codeguru-profiler-java-agent-standalone-${VERSION}.jar"         \
				-o "agents/codeguru-profiler-java-agent-standalone-${VERSION}.jar"                       \
				-q
