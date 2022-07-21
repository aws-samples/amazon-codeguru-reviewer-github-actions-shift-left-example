# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import json
import logging
import os

from codeguru_profiler_agent import with_lambda_profiler


logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger('codeguru_profiler_agent').setLevel(logging.DEBUG)
logging.getLogger('botocore').setLevel(logging.DEBUG)

CORS_HEADERS = {'Access-Control-Allow-Origin': '*'}


def extract_settings(event, context, env_variables):
    prefix = env_variables['COVERS_STORAGE_PREFIX']

    settings = {
        'bucket_name': env_variables['COVERS_STORAGE_BUCKET_NAME'],
        'object_name_prefix': prefix + '/' if not prefix.endswith('/') else prefix,
        'expiration': int(env_variables['PRESIGNED_LINK_VALIDNESS_DURATION_IN_S'])
    }

    return settings


def validate_input(event):
    if event['headers']['content-type'] is None or event['headers']['content-type'] == '':
        raise ValueError('"Content-Type" header is missing')

    if not event['headers']['content-type'].startswith('application/json'):
        raise ValueError('"Content-Type" header should be "application/json"')

    parameters = json.loads(event['body'])

    if parameters['name'] is None or parameters['name'] == '':
        raise ValueError('Missing "name" provided in the body')

    if parameters['type'] is None or parameters['type'] == '':
        raise ValueError('Missing "type" provided in the body')

    if parameters['type'] not in ['image/png', 'image/jpeg']:
        raise ValueError('Unsupported "type" provided in the body')

    return parameters


def create_presigned_url(settings, input):
    s3_client = boto3.client('s3')

    response = s3_client.generate_presigned_post(
        settings['bucket_name'],
        f'{settings["object_name_prefix"]}{input["name"]}',
        Fields={'Content-Type': input['type']},
        ExpiresIn=settings['expiration']
    )

    return response


@with_lambda_profiler()
def request_handler(event, context):
    settings = extract_settings(event, context, os.environ)
    logging.info('Extracted settings: %s', json.dumps(settings))

    try:
        sanitized_input = validate_input(event)
        logging.info('Sanitized input values: %s', json.dumps(sanitized_input))

        url = create_presigned_url(settings, sanitized_input)
        logging.info('Generated presigned URL: %s', json.dumps(url))

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(url)
        }
    except Exception as error:
        logging.error('Error caught: %s', error)

        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'reason': str(error)})
        }
