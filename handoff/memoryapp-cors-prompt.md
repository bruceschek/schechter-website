# Prompt to paste into Claude Code in the MemoryApp project

---

I want to add a **web** client (a browser page) that talks to the same `/memory`
API the iOS app uses — same Cognito login (users sign in with the same
email/password as the app) and the same DynamoDB data. The web page will be a
panel on an external site (`https://schechter.com/test.html`).

The backend logic doesn't need to change. The **only** thing blocking a browser
is CORS preflight. Please make the one infra change below, deploy it, and verify.

## Diagnosis (already confirmed against the live API)

- The Lambda is already CORS-ready: `lambda_function.py` defines `CORS_HEADERS`
  with `Access-Control-Allow-Origin: *` on every response, and handles `OPTIONS`
  by returning `204 + CORS_HEADERS` (near the top of `lambda_handler`).
- BUT `infra/template.yaml` only defines a **POST** method on `/memory`. So a
  browser's automatic, unauthenticated `OPTIONS` preflight hits API Gateway,
  which has no OPTIONS method → returns `403 Missing Authentication Token`, and
  the Cognito `DefaultAuthorizer` would reject it anyway (preflight carries no
  `Authorization` header). The preflight never reaches the Lambda, so the
  browser blocks the real POST.
- Verified live: `OPTIONS /prod/memory` → `403`; unauthenticated `POST` → `401`;
  no `Access-Control-Allow-Origin` header on either.

## The change (template-only, no Lambda code change)

In `infra/template.yaml`, on the `MemoryFunction` resource, add a second API
event for `OPTIONS` that bypasses the authorizer. Final `Events:` block:

```yaml
      Events:
        ApiPost:
          Type: Api
          Properties:
            RestApiId: !Ref MemoryApi
            Path: /memory
            Method: POST
        # CORS preflight — unauthenticated OPTIONS, must bypass Cognito.
        # Routes to the Lambda's existing OPTIONS handler (204 + CORS_HEADERS).
        ApiOptions:
          Type: Api
          Properties:
            RestApiId: !Ref MemoryApi
            Path: /memory
            Method: OPTIONS
            Auth:
              Authorizer: NONE
```

`Authorizer: NONE` on this single event overrides the `DefaultAuthorizer` so the
OPTIONS method is public. Don't change anything else.

## Deploy

```
sam build -t infra/template.yaml && sam deploy -t infra/template.yaml
```

## Verify (please actually run these and report back)

1. Preflight now succeeds and is public:
   ```
   curl -i -X OPTIONS \
     "https://fjic2zgsqf.execute-api.us-west-2.amazonaws.com/prod/memory" \
     -H "Origin: https://schechter.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: authorization,content-type"
   ```
   Expect `2xx` (204) WITH an `Access-Control-Allow-Origin` header — NOT 403.
2. Confirm an authenticated POST still works (use the app or a real ID token) and
   its response carries `Access-Control-Allow-Origin`.

## Questions for you to answer back to me (needed for the web client)

1. **Token type:** the Swift app sends the Cognito **ID token** as
   `Authorization: Bearer <token>` (via `getIDToken()`). Confirm the API Gateway
   Cognito authorizer accepts the ID token (it should by default). The web client
   will send the same.
2. **User Pool wiring for the browser SRP login**, from the CloudFormation
   Outputs: `UserPoolId` and `UserPoolClientId`, plus the region (`us-west-2`).
   The app client is a public client (`GenerateSecret: false`) with
   `ALLOW_USER_SRP_AUTH` — confirm that's still the case so the browser can do SRP
   login with `amazon-cognito-identity-js`.
3. **Optional, your call:** do you want to tighten the Lambda's
   `Access-Control-Allow-Origin` from `*` to `https://schechter.com`? Not
   required (the endpoint needs a Bearer token, so `*` is low-risk), but it's a
   one-line change in `CORS_HEADERS` if you prefer to lock it down.
```
