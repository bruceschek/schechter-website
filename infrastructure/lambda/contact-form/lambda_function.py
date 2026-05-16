import json
import random
import boto3
import os
from botocore.exceptions import ClientError

ses = boto3.client('ses', region_name='us-east-1')

TO_EMAIL = os.environ.get('TO_EMAIL', 'bruce@schechter.com')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'bruce@schechter.com')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
}


def generate_math_problem():
    a = random.randint(3, 10)
    b = random.randint(3, 10)
    op = random.choice(['add', 'multiply'])
    if op == 'add':
        return {'a': a, 'b': b, 'op': op, 'answer': a + b,
                'question': f'What is {a} + {b}?'}
    else:
        return {'a': a, 'b': b, 'op': op, 'answer': a * b,
                'question': f'What is {a} × {b}?'}


def verify_answer(a, b, op, user_answer):
    try:
        user_answer = int(user_answer)
    except (ValueError, TypeError):
        return False
    if op == 'add':
        return user_answer == a + b
    elif op == 'multiply':
        return user_answer == a * b
    return False


def send_email(name, email, message):
    body = f"""New contact form submission from schechter.com

Name:    {name}
Email:   {email}
Message:
{message}
"""
    ses.send_email(
        Source=FROM_EMAIL,
        Destination={'ToAddresses': [TO_EMAIL]},
        Message={
            'Subject': {'Data': f'schechter.com contact from {name}'},
            'Body': {'Text': {'Data': body}},
        },
        ReplyToAddresses=[email],
    )


def lambda_handler(event, context):
    method = event.get('httpMethod', '')

    # CORS preflight
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    # Generate a new math problem (GET /contact/captcha)
    path = event.get('path', '')
    if method == 'GET' and path.endswith('/captcha'):
        problem = generate_math_problem()
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'question': problem['question'],
                'a': problem['a'],
                'b': problem['b'],
                'op': problem['op'],
            }),
        }

    # Handle form submission (POST /contact)
    if method == 'POST':
        try:
            body = json.loads(event.get('body') or '{}')
        except json.JSONDecodeError:
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Invalid request body'})}

        name = (body.get('name') or '').strip()
        email = (body.get('email') or '').strip()
        message = (body.get('message') or '').strip()
        user_answer = body.get('math_answer')
        a = body.get('math_a')
        b = body.get('math_b')
        op = body.get('math_op')

        # Validate required fields
        if not all([name, email, message]):
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Name, email, and message are required'})}

        # Validate math answer
        if not verify_answer(a, b, op, user_answer):
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Incorrect math answer — please try again'})}

        try:
            send_email(name, email, message)
        except ClientError as e:
            print(f"SES error: {e}")
            return {'statusCode': 500, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Failed to send message. Please try again later.'})}

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'message': 'Message sent! I\'ll be in touch soon.'}),
        }

    return {'statusCode': 405, 'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Method not allowed'})}
