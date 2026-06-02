import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-west-2' });

interface CaptchaQuestion {
  a: number;
  b: number;
  op: 'add' | 'multiply';
  question: string;
}

function generateCaptcha(): CaptchaQuestion {
  const a = Math.floor(Math.random() * 8) + 3;
  const b = Math.floor(Math.random() * 8) + 3;
  const op = Math.random() < 0.5 ? 'add' : 'multiply';
  const question = op === 'add' ? `What is ${a} + ${b}?` : `What is ${a} × ${b}?`;
  return { a, b, op, question };
}

function validateCaptcha(a: number, b: number, op: string, answer: number): boolean {
  const expected = op === 'add' ? a + b : a * b;
  return expected === answer;
}

export const handler = async (event: any) => {
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || '';

  try {
    if (httpMethod === 'GET' && (path === '/captcha' || path.endsWith('/captcha'))) {
      const captcha = generateCaptcha();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: captcha.a,
          b: captcha.b,
          op: captcha.op,
          question: captcha.question
        })
      };
    }

    if (httpMethod === 'POST') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      const { name, email, message, math_answer, math_a, math_b, math_op } = body;

      if (!name || !email || !message || !math_answer) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Missing required fields' })
        };
      }

      const answer = parseInt(math_answer);
      if (isNaN(answer) || !validateCaptcha(math_a, math_b, math_op, answer)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Incorrect math answer' })
        };
      }

      await ses.send(new SendEmailCommand({
        Source: 'noreply@schechter.com',
        Destination: { ToAddresses: ['bruce@schechter.com'] },
        ReplyToAddresses: [email],
        Message: {
          Subject: { Data: `New contact form submission from ${name}` },
          Body: {
            Text: {
              Data: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
            }
          }
        }
      }));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Message sent successfully!' })
      };
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
