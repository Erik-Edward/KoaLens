# Overview

The auth methods can be accessed via the `supabase.auth` namespace.

> By default, the supabase client sets persistSession to true and attempts to store the session in local storage. When using the supabase client in an environment that doesn't support local storage, you might notice the following warning message being logged:
>
> *No storage option exists to persist the session, which may result in unexpected behavior when using auth. If you want to set persistSession to true, please provide a storage option or you may set persistSession to false to disable this warning.*
>
> This warning message can be safely ignored if you're not using auth on the server-side. If you are using auth and you want to set persistSession to true, you will need to provide a custom storage implementation that follows [this interface](https://github.com/supabase/gotrue-js/blob/master/src/lib/types.ts#L1027).

Any email links and one-time passwords (OTPs) sent have a default expiry of 24 hours. We have rate limits in place to guard against brute force attacks.

The expiry of an access token can be set in the "JWT expiry limit" field in your project's auth settings. A refresh token never expires and can only be used once.

## Examples

### Create auth client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabase_url, anon_key)
```

### Create auth client (server-side)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabase_url, anon_key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})
```