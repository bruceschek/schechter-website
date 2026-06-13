const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-west-2' });
const FROM = 'bruce@schechter.com';   // verified SES identity (sandbox-safe)
const TO   = 'bruce@schechter.com';

function generateCaptcha() {
  const a = Math.floor(Math.random() * 8) + 3;
  const b = Math.floor(Math.random() * 8) + 3;
  const op = Math.random() < 0.5 ? 'add' : 'multiply';
  const question = op === 'add' ? `What is ${a} + ${b}?` : `What is ${a} × ${b}?`;
  return { a, b, op, question };
}
function validateCaptcha(a, b, op, answer) {
  const expected = op === 'add' ? a + b : a * b;
  return expected === answer;
}
const json = (statusCode, obj) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path   = event.requestContext?.http?.path || event.rawPath || '/';
  try {
    if (method === 'GET' && path.endsWith('/captcha')) {
      const c = generateCaptcha();
      return json(200, { a: c.a, b: c.b, op: c.op, question: c.question });
    }
    if (method === 'POST') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      const { name, email, message, math_answer, math_a, math_b, math_op } = body;
      if (!name || !email || !message || math_answer == null) {
        return json(400, { success: false, error: 'Missing required fields' });
      }
      const answer = parseInt(math_answer, 10);
      if (isNaN(answer) || !validateCaptcha(Number(math_a), Number(math_b), math_op, answer)) {
        return json(400, { success: false, error: 'Incorrect math answer' });
      }
      await ses.send(new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [TO] },
        ReplyToAddresses: [email],
        Message: {
          Subject: { Data: `New contact form submission from ${name} - RingRing` },
          Body: { Text: { Data: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}` } },
        },
      }));
      return json(200, { success: true, message: 'Message sent successfully!' });
    }
    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    return json(500, { success: false, error: 'Internal server error' });
  }
};
