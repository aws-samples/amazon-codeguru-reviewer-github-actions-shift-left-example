# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

workspace "amazon-codeguru-technical-deep-dive" "AWS deployment architecture." {

    model {
        bookwormApp = softwaresystem "Bookworm" "Fragment of a SaaS application that manages your personal book, eBook and audiobook library." "Serverless Application" {
        }

        live = deploymentEnvironment "Live" {

            deploymentNode "Amazon Web Services" {
                tags "Amazon Web Services - Cloud"

                region = deploymentNode "Frankfurt (eu-central-1)" {
                    tags "Amazon Web Services - Region"

                    api = infrastructureNode "API Gateway" {
                        description "Fully-managed REST API that exposes endpoint for uploading book covers."
                        tags "Amazon Web Services - API Gateway"
                    }

                    lambda = infrastructureNode "Upload Book Cover" {
                        description "Python implementation that generates a presigned URL for Amazon S3 bucket to upload book covers."
                        tags "Amazon Web Services - Lambda"
                    }

                    coverStorage = infrastructureNode "Book Cover Storage" {
                        description "Book covers storage in a form of Amazon S3 bucket."
                        tags "Amazon Web Services - Simple Storage Service S3 Bucket"
                    }

                    webApp = infrastructureNode "Web Application" {
                        description "Single-page Application that leverages presented API and presigned links to Amazon S3 bucket."
                    }

                    thumbnailGenerationQueue = infrastructureNode "Thumbnail Generation Queue" {
                        description "A queue that stores information which cover needs a thumbnail to be generated."
                        tags "Amazon Web Services - Simple Queue Service SQS"
                    }

                    deploymentNode "Amazon VPC" {
                        tags "Amazon Web Services - VPC"

                        deploymentNode "AWS Fargate Cluster" {
                            tags "Amazon Web Services - Fargate"

                            thumbnailGenerationService = infrastructureNode "Thumbnail Generation Service" {
                                description "Java application that creates thumbnails and saves them in Amazon S3 Bucket."
                                tags "Amazon Web Services - Fargate"
                            }
                        }
                    }
                }
            }

            api -> lambda "Invokes" "AWS Lambda Proxy"
            lambda -> api "Returns" "Presigned URL"

            webApp -> api "Invokes" "HTTPS"
            api -> webApp "Returns" "Presigned URL"

            webApp -> coverStorage "Upload image file via presigned URL (POST)" "PutObject (HTTPS)"
            coverStorage -> thumbnailGenerationQueue "New object created" "S3 Event Notification"

            thumbnailGenerationQueue -> thumbnailGenerationService "Receive messages" "Polling SQS Messages (HTTPS)"
            thumbnailGenerationService -> coverStorage "Upload generated thumbnail" "PutObject (HTTPS)"
        }
    }

    views {
        deployment bookwormApp "Live" "AmazonWebServicesDeployment" {
            include *
            autolayout lr
        }

        styles {
            element "Element" {
                background #ffffff
                color #000000
            }
            element "Infrastructure Node" {
                shape roundedbox
            }
        }

        themes https://static.structurizr.com/themes/amazon-web-services-2020.04.30/theme.json
    }

}
