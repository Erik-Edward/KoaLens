# Listen to auth events

Receive a notification every time an auth event happens.

> Subscribes to important events occurring on the user's session.
> 
> Use on the frontend/client. It is less useful on the server.
>
> Events are emitted across tabs to keep your application's UI up-to-date. Some events can fire very frequently, based on the number of tabs open. Use a quick and efficient callback function, and defer or debounce as many operations as you can to be performed outside of the callback.
>
> **Important**: A callback can be an async function and it runs synchronously during the processing of the changes causing the event. You can easily create a dead-lock by using await on a call to another method of the Supabase library.

### Best Practices

- Avoid using async functions as callbacks.
- Limit the number of await calls in async callbacks.
- Do not use other Supabase functions in the callback function. If you must, dispatch the functions once the callback has finished executing. Use this as a quick way to achieve this:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    // await on other Supabase function here
    // this runs right after the callback has finished
  }, 0)
})
```

### Emitted events

#### INITIAL_SESSION
- Emitted right after the Supabase client is constructed and the initial session from storage is loaded.

#### SIGNED_IN
- Emitted each time a user session is confirmed or re-established, including on user sign in and when refocusing a tab.
- Avoid making assumptions as to when this event is fired, this may occur even when the user is already signed in. Instead, check the user object attached to the event to see if a new user has signed in and update your application's UI.
- This event can fire very frequently depending on the number of tabs open in your application.

#### SIGNED_OUT
- Emitted when the user signs out. This can be after:
  - A call to `supabase.auth.signOut()`
  - After the user's session has expired for any reason:
    - User has signed out on another device
    - The session has reached its timebox limit or inactivity timeout
    - User has signed in on another device with single session per user enabled
- Use this to clean up any local storage your application has associated with the user.

#### TOKEN_REFRESHED
- Emitted each time a new access and refresh token are fetched for the signed in user.
- It's best practice and highly recommended to extract the access token (JWT) and store it in memory for further use in your application.
  - Avoid frequent calls to `supabase.auth.getSession()` for the same purpose.
- There is a background process that keeps track of when the session should be refreshed so you will always receive valid tokens by listening to this event.
- The frequency of this event is related to the JWT expiry limit configured on your project.

#### USER_UPDATED
- Emitted each time the `supabase.auth.updateUser()` method finishes successfully.
- Listen to it to update your application's UI based on new profile information.

#### PASSWORD_RECOVERY
- Emitted instead of the SIGNED_IN event when the user lands on a page that includes a password recovery link in the URL.
- Use it to show a UI to the user where they can reset their password.

## Parameters

### callback (Required) - function
A callback function to be invoked when an auth event happens.

#### Details
- **Parameters** - callback parameters
- **Return** - One of the following options:
  - Option 1: void
  - Option 2: Promise<void>

## Return Type

object

### Details

#### data (Required) - object
##### Details
**subscription** (Required) - Subscription
###### Details
- **id** (Required) - string
  - The subscriber UUID. This will be set by the client.
- **callback** (Required) - function
  - The function to call every time there is an event. eg: (eventName) => {}
- **unsubscribe** (Required) - function
  - Call this to remove the listener.

## Examples

### Listen to auth changes
```typescript
const { data } = supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  if (event === 'INITIAL_SESSION') {
    // handle initial session
  } else if (event === 'SIGNED_IN') {
    // handle sign in event
  } else if (event === 'SIGNED_OUT') {
    // handle sign out event
  } else if (event === 'PASSWORD_RECOVERY') {
    // handle password recovery event
  } else if (event === 'TOKEN_REFRESHED') {
    // handle token refreshed event
  } else if (event === 'USER_UPDATED') {
    // handle user updated event
  }
})

// call unsubscribe to remove the callback
data.subscription.unsubscribe()
```

### Listen to sign out
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.log('SIGNED_OUT', session)
    // clear local and session storage
    [
      window.localStorage,
      window.sessionStorage,
    ].forEach((storage) => {
      Object.entries(storage)
        .forEach(([key]) => {
          storage.removeItem(key)
        })
    })
  }
})
```

### Store OAuth provider tokens on sign in
```typescript
// Register this immediately after calling createClient!
// Because signInWithOAuth causes a redirect, you need to fetch the
// provider tokens from the callback.
supabase.auth.onAuthStateChange((event, session) => {
  if (session && session.provider_token) {
    window.localStorage.setItem('oauth_provider_token', session.provider_token)
  }
  if (session && session.provider_refresh_token) {
    window.localStorage.setItem('oauth_provider_refresh_token', session.provider_refresh_token)
  }
  if (event === 'SIGNED_OUT') {
    window.localStorage.removeItem('oauth_provider_token')
    window.localStorage.removeItem('oauth_provider_refresh_token')
  }
})
```

### Use React Context for the User's session
```typescript
const SessionContext = React.createContext(null)

function main() {
  const [session, setSession] = React.useState(null)
  
  React.useEffect(() => {
    const {data: { subscription }} = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null)
        } else if (session) {
          setSession(session)
        }
      })
      
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SessionContext.Provider value={session}>
      <App />
    </SessionContext.Provider>
  )
}
```

### Listen to password recovery events
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    console.log('PASSWORD_RECOVERY', session)
    // show screen to update user's password
    showPasswordResetScreen(true)
  }
})
```

### Listen to sign in
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') console.log('SIGNED_IN', session)
})
```

### Listen to token refresh
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') console.log('TOKEN_REFRESHED', session)
})
```

### Listen to user updates
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'USER_UPDATED') console.log('USER_UPDATED', session)
})
```