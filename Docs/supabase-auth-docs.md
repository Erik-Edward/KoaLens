# Sign in a user

Log in an existing user with an email and password or phone and password.

> Requires either an email and password or a phone number and password.

## Parameters

### credentials (Required)
One of the following options:

#### Option 1 (object)

##### Details
- **email** (Required) - string
  - The user's email address.

- **password** (Required) - string
  - The user's password.

- **options** (Optional) - object
  - **captchaToken** (Optional) - string
    - Verification token received when the user completes the captcha on the site.

#### Option 2 (object)

##### Details
- **password** (Required) - string
  - The user's password.

- **phone** (Required) - string
  - The user's phone number.

- **options** (Optional) - object
  - **captchaToken** (Optional) - string
    - Verification token received when the user completes the captcha on the site.

## Return Type

Promise<One of the following options>

### Option 1 (object)

#### Details

##### data (Required) - object

###### Details

**session** (Required) - Session

###### Details
- **access_token** (Required) - string
  - The access token jwt. It is recommended to set the JWT_EXPIRY to a shorter expiry value.

- **expires_in** (Required) - number
  - The number of seconds until the token expires (since it was issued). Returned when a login is confirmed.

- **refresh_token** (Required) - string
  - A one-time used refresh token that never expires.

- **token_type** (Required) - string

- **expires_at** (Optional) - number
  - A timestamp of when the token will expire. Returned when a login is confirmed.

- **provider_refresh_token** (Optional) - One of the following options:
  - Option 1: null
  - Option 2: string
  > The oauth provider refresh token. If present, this can be used to refresh the provider_token via the oauth provider's API. Not all oauth providers return a provider refresh token. If the provider_refresh_token is missing, please refer to the oauth provider's documentation for information on how to obtain the provider refresh token.

- **provider_token** (Optional) - One of the following options:
  - Option 1: null
  - Option 2: string
  > The oauth provider token. If present, this can be used to make external API requests to the oauth provider used.

**user** (Required) - User

###### Details
- **app_metadata** (Required) - UserAppMetadata
  - **provider** (Optional) - string

- **aud** (Required) - string
- **created_at** (Required) - string
- **id** (Required) - string
- **user_metadata** (Required) - UserMetadata
- **action_link** (Optional) - string
- **confirmation_sent_at** (Optional) - string
- **confirmed_at** (Optional) - string
- **email** (Optional) - string
- **email_change_sent_at** (Optional) - string
- **email_confirmed_at** (Optional) - string

- **factors** (Optional) - Array<Factor>
  ###### Details
  - **created_at** (Required) - string
  - **factor_type** (Required) - One of the following options:
    - Option 1
    - Option 2: "totp"
    - Option 3: "phone"
    > Type of factor. totp and phone supported with this version
  - **id** (Required) - string
    - ID of the factor.
  - **status** (Required) - One of the following options:
    - Option 1: "verified"
    - Option 2: "unverified"
    > Factor's status.
  - **updated_at** (Required) - string
  - **friendly_name** (Optional) - string
    - Friendly name of the factor, useful to disambiguate between multiple factors.

- **identities** (Optional) - Array<UserIdentity>
  ###### Details
  - **id** (Required) - string
  - **identity_id** (Required) - string
  - **provider** (Required) - string
  - **user_id** (Required) - string
  - **created_at** (Optional) - string
  - **identity_data** (Optional) - {[key: string]: any}
  - **last_sign_in_at** (Optional) - string
  - **updated_at** (Optional) - string

- **invited_at** (Optional) - string
- **is_anonymous** (Optional) - boolean
- **last_sign_in_at** (Optional) - string
- **new_email** (Optional) - string
- **new_phone** (Optional) - string
- **phone** (Optional) - string
- **phone_confirmed_at** (Optional) - string
- **recovery_sent_at** (Optional) - string
- **role** (Optional) - string
- **updated_at** (Optional) - string

**weak_password** (Optional) - WeakPassword
###### Details
- **message** (Required) - string
- **reasons** (Required) - Array<One of the following options>
  - Option 1: "length"
  - Option 2: "characters"
  - Option 3: "pwned"
  - Option 4

**error** (Required) - null

### Option 2 (object)

#### Details
##### data (Required) - object
###### Details
- **session** (Required) - null
- **user** (Required) - null
- **weak_password** (Optional) - null
- **error** (Required) - AuthError

## Example

### Sign in with email and password

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'example@email.com',
  password: 'example-password',
})
```

### Response

```json
{
  "data": {
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "aud": "authenticated",
      "role": "authenticated",
      "email": "example@email.com",
      "email_confirmed_at": "2024-01-01T00:00:00Z",
      "phone": "",
      "last_sign_in_at": "2024-01-01T00:00:00Z",
      "app_metadata": {
        "provider": "email",
        "providers": [
          "email"
        ]
      },
      "user_metadata": {},
      "identities": [
        {
          "identity_id": "22222222-2222-2222-2222-222222222222",
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "11111111-1111-1111-1111-111111111111",
          "identity_data": {
            "email": "example@email.com",
            "email_verified": false,
            "phone_verified": false,
            "sub": "11111111-1111-1111-1111-111111111111"
          },
          "provider": "email",
          "last_sign_in_at": "2024-01-01T00:00:00Z",
          "created_at": "2024-01-01T00:00:00Z",
          "updated_at": "2024-01-01T00:00:00Z",
          "email": "example@email.com"
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "<ACCESS_TOKEN>",
      "token_type": "bearer",
      "expires_in": 3600,
      "expires_at": 1700000000,
      "refresh_token": "<REFRESH_TOKEN>",
      "user": {
        "id": "11111111-1111-1111-1111-111111111111",
        "aud": "authenticated",
        "role": "authenticated",
        "email": "example@email.com",
        "email_confirmed_at": "2024-01-01T00:00:00Z",
        "phone": "",
        "last_sign_in_at": "2024-01-01T00:00:00Z",
        "app_metadata": {
          "provider": "email",
          "providers": [
            "email"
          ]
        },
        "user_metadata": {},
        "identities": [
          {
            "identity_id": "22222222-2222-2222-2222-222222222222",
            "id": "11111111-1111-1111-1111-111111111111",
            "user_id": "11111111-1111-1111-1111-111111111111",
            "identity_data": {
              "email": "example@email.com",
              "email_verified": false,
              "phone_verified": false,
              "sub": "11111111-1111-1111-1111-111111111111"
            },
            "provider": "email",
            "last_sign_in_at": "2024-01-01T00:00:00Z",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "email": "example@email.com"
          }
        ],
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    }
  },
  "error": null
}