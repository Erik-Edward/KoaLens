# Layout routes

Learn how to define shared UI elements such as tab bars and headers.

By default, routes fill the entire screen. Moving between them is a full-page transition with no animation. In native apps, users expect shared elements like headers and tab bars to persist between pages. These are created using layout routes.

## Create a layout route

To create a layout route for a directory, create a file named `_layout.tsx` in the directory, and export a React component as default.

### app/home/_layout.tsx

```jsx
import { Slot } from 'expo-router';

export default function HomeLayout() {
  return <Slot />;
}
```

From the above example, `Slot` will render the current child route, think of this like the `children` prop in React. This component can be wrapped with other components to create a layout.

### app/home/_layout.tsx

```jsx
import { Slot } from 'expo-router';

export default function HomeLayout() {
  return (
    <>
      <Header />
      <Slot />
      <Footer />
    </>
  );
}
```

Expo Router supports adding a single layout route for a given directory. If you want to use multiple layout routes, add multiple directories:

```
app
 ├─ _layout.tsx
 └─ home
    ├─ _layout.tsx
    └─ index.tsx
```

### app/_layout.tsx

```jsx
import { Tabs } from 'expo-router';

export default function Layout() {
  return <Tabs />;
}
```

### app/home/_layout.tsx

```jsx
import { Stack } from 'expo-router';

export default function Layout() {
  return <Stack />;
}
```

If you want multiple layout routes without modifying the URL, you can use [groups](#groups).

## Groups

You can prevent a segment from showing in the URL by using the group syntax `()`.

- `app/root/home.tsx` matches `/root/home`
- `app/(root)/home.tsx` matches `/home`

This is useful for adding layouts without adding additional segments to the URL. You can add as many groups as you want.

Groups are also good for organizing sections of the app. In the following example, we have `app/(app)` which is where the main app lives, and `app/(aux)` which is where auxiliary pages live. This is useful for adding pages which you want to link to externally, but don't need to be part of the main app.

```
app
 ├─ (app)
 │   ├─ index.tsx
 │   └─ user.tsx
 └─ (aux)
     ├─ terms-of-service.tsx
     └─ privacy-policy.tsx
```

## Native layouts

One of the best advantages to React Native is being able to use native UI components. Expo Router provides a few drop-in native layouts that you can use to easily achieve familiar native behavior. To change between truly-native layouts on certain platforms and custom layouts on others, see [Platform-specific modules](https://docs.expo.dev/router/advanced/platform-specific-modules/).

### app/home/_layout.tsx

```jsx
import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ ... }} />
  );
}
```