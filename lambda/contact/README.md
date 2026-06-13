# Contact form Lambda (`schechter-contact`)

Backend for the contact form on `contact.html`. This is a **standalone Lambda**,
deployed *outside* the Amplify pipeline (the Amplify app is static-only). The
public Function URL is hardcoded in `src/contact.html`.

- **Function:** `schechter-contact` (us-west-2, nodejs20.x, handler `index.handler`)
- **Function URL:** auth NONE, CORS `*` — `https://5rivx2rqiv54l7qn5n3flccuyq0idayh.lambda-url.us-west-2.on.aws/`
- **Endpoints:** `GET /captcha` returns a math question; `POST /` sends the email.
- **Email:** SES sends From `bruce@schechter.com` To `bruce@schechter.com`
  (Reply-To = submitter). Both verified, so it works in the SES sandbox.

## Deploy after editing `index.js`

```sh
cd lambda/contact
zip function.zip index.js
aws lambda update-function-code \
  --function-name schechter-contact \
  --zip-file fileb://function.zip \
  --region us-west-2
aws lambda wait function-updated --function-name schechter-contact --region us-west-2
rm function.zip
```

`index.js` here is the source of truth — keep it in sync with the deployed code.
