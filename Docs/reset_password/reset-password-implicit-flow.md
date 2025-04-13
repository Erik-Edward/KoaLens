### **Resetting a password**

**Implicit flow**

#### Step 1: Create a reset password page

Create a reset password page. This page should be publicly accessible.

Collect the user's email address and request a password reset email. Specify the redirect URL, which should point to the URL of a change password page. This URL needs to be configured in your [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

```javascript
await supabase.auth.resetPasswordForEmail('valid.email@supabase.io', {
  redirectTo: 'http://example.com/account/update-password',
})
```

#### Step 2: Create a change password page

Create a change password page at the URL you specified in the previous step. This page should be accessible only to authenticated users.

Collect the user's new password and call updateUser to update their password.

```javascript
await supabase.auth.updateUser({ password: 'new_password' })
```
