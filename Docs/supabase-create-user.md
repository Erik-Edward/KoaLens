# Create a new user

Creates a new user.

By default, the user needs to verify their email address before logging in. To turn this off, disable Confirm email in your project.

> Confirm email determines if users need to confirm their email address after signing up.
> - If Confirm email is enabled, a user is returned but session is null.
> - If Confirm email is disabled, both a user and a session are returned.

When the user confirms their email address, they are redirected to the SITE_URL by default. You can modify your SITE_URL or add additional redirect URLs in your project.

If signUp() is called for an existing confirmed user:
- When both Confirm email and Confirm phone (even when phone provider is disabled) are enabled in your project, an obfuscated/fake user object is returned.
- When either Confirm email or Confirm phone (even when phone provider is disabled) is disabled, the error message "User already registered" is returned.

To fetch the currently logged-in user, refer to getUser().

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
  - **data** (Optional) - object
    - A custom data object to store the user's metadata. This maps to the auth.users.raw_user_meta_data column.
  - **emailRedirectTo** (Optional) - string
    - The redirect url embedded in the email link

#### Option 2 (object)

##### Details
- **password** (Required) - string
  - The user's password.

- **phone** (Required) - string
  - The user's phone number.

- **options** (Optional) - object
  - **captchaToken** (Optional) - string
    - Verification token received when the user completes the captcha on the site. Requires a configured WhatsApp sender on Twilio
  - **channel** (Optional) - One of the following options:
    - Option 1: "sms"
    - Option 2: "whatsapp"
    > Messaging channel to use (e.g. whatsapp or sms)
  - **data** (Optional) - object
    - A custom data object to store the user's metadata. This maps to the auth.users.raw_user_meta_data column.

## Return Type

Promise<One of the following options>

### Option 1 (object)

#### Details
- **data** (Required) - object
  - Details
- **error** (Required) - null

### Option 2 (object)

#### Details
- **data** (Required) - object
  - Details
- **error** (Required) - AuthError

## Example

### Sign up with an email and password

```typescript
const { data, error } = await supabase.auth.signUp({
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
```