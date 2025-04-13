## Send a password reset request

Sends a password reset request to an email address. This method supports the PKCE flow.

- The password reset flow consist of 2 broad steps: (i) Allow the user to login via the password reset link; (ii) Update the user's password.

  The resetPasswordForEmail() only sends a password reset link to the user's email. To update the user's password, see [updateUser()](https://supabase.com/docs/reference/javascript/auth-updateuser).

  A PASSWORD_RECOVERY event will be emitted when the password recovery link is clicked. You can use [onAuthStateChange()](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) to listen and invoke a callback function on these events.

  When the user clicks the reset link in the email they are redirected back to your application. You can configure the URL that the user is redirected to with the redirectTo parameter. See [redirect URLs and wildcards](https://supabase.com/docs/guides/auth#redirect-urls-and-wildcards) to add additional redirect URLs to your project.

  After the user has been redirected successfully, prompt them for a new password and call updateUser():

```javascript
const { data, error } = await supabase.auth.updateUser({
  password: new_password
})
```

### **Parameters**

- `email` Required string

  The email address of the user.

- `options` Required object

  Details

  - `captchaToken` Optional string

    Verification token received when the user completes the captcha on the site.

  - `redirectTo` Optional string

    The URL to send the user to after they click the password reset link.

### **Return Type**

Promise\<One of the following options\>

Details

- Option 1 object

  Details

  - `data` Required

  - `error` Required null

- Option 2 object

  Details

  - `data` Required null

  - `error` Required AuthError

### **Reset password (React)**

```javascript
/**
 * Step 1: Send the user an email to get a password reset token.
 * This email contains a link which sends the user back to your application.
 */
const { data, error } = await supabase.auth
  .resetPasswordForEmail('user@email.com')

/**
 * Step 2: Once the user is redirected back to your application,
 * ask the user to reset their password.
 */
useEffect(() => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event == "PASSWORD_RECOVERY") {
      const newPassword = prompt("What would you like your new password to be?");
      const { data, error } = await supabase.auth
        .updateUser({ password: newPassword })
      
      if (data) alert("Password updated successfully!")
      if (error) alert("There was an error updating your password.")
    }
  })
}, [])
```
