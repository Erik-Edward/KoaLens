### Resetting a password

PKCE flow

The PKCE flow allows for server-side authentication. Unlike the implicit flow, which directly provides your app with the access token after the user clicks the confirmation link, the PKCE flow requires an intermediate token exchange step before you can get the access token.

##### Step 1: Update reset password email

Update your reset password email template to send the token hash. See [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) for how to configure your email templates.

Your signup email template should contain the following HTML:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p>
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/update-password"
>Reset Password</a
>
</p>
```

##### Step 2: Create token exchange endpoint

Create an API endpoint at <YOUR_SITE_URL>/auth/confirm to handle the token exchange.

Make sure you're using the right supabase client in the following code.

If you're not using Server-Side Rendering or cookie-based Auth, you can directly use the createClient from @supabase/supabase-js. If you're using Server-Side Rendering, see the [Server-Side Auth guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client) for instructions on creating your Supabase client.

Express

Create a new route in your express app and populate with the following:

```javascript
// The client you created from the Server-Side Auth instructions
const { createClient } = require("./lib/supabase")
...

app.get("/auth/confirm", async function (req, res) {
  const token_hash = req.query.token_hash
  const type = req.query.type
  const next = req.query.next ?? "/"

  if (token_hash && type) {
    const supabase = createClient({ req, res })
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      res.redirect(303, `/${next.slice(1)}`)
    }
  }

  // return the user to an error page with some instructions
  res.redirect(303, '/auth/auth-code-error')
})
```

##### Step 3: Call the reset password by email function to initiate the flow

JavaScript

```javascript
async function resetPassword() {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email)
}
```

Once you have a session, collect the user's new password and call updateUser to update their password.

```javascript
await supabase.auth.updateUser({ password: 'new_password' })
```
