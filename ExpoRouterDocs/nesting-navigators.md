# Nesting navigators

Learn how to nest navigators in Expo Router.

> Navigation UI elements (Link, Tabs, Stack) may move out of the Expo Router library in the future.

Nesting navigators allow rendering a navigator inside the screen of another navigator. This guide is an extension of [React Navigation: Nesting navigators](https://reactnavigation.org/docs/nesting-navigators) to Expo Router. It provides an example of how nesting navigators work when using Expo Router.

## Example

Consider the following file structure which is used as an example:

```
app
 ├─ _layout.tsx
 ├─ index.tsx
 └─ home
    ├─ _layout.tsx
    ├─ feed.tsx
    └─ messages.tsx
```

In the above example, `app/home/feed.tsx` matches `/home/feed`, and `app/home/messages.tsx` matches `/home/messages`.

### app/_layout.tsx

```jsx
import { Stack } from 'expo-router';

export default Stack;
```

Both `app/home/_layout.tsx` and `app/index.tsx` below are nested in the `app/_layout.tsx` layout so that it will be rendered as a stack.

### app/home/_layout.tsx

```jsx
import { Tabs } from 'expo-router';

export default Tabs;
```

### app/index.tsx

```jsx
import { Link } from 'expo-router';

export default function Root() {
  return <Link href="/home/messages">Navigate to nested route</Link>;
}
```

Both `app/home/feed.tsx` and `app/home/messages.tsx` below are nested in the `home/_layout.tsx` layout, so it will be rendered as a tab.

### app/home/feed.tsx

```jsx
import { View, Text } from 'react-native';

export default function Feed() {
  return (
    <View>
      <Text>Feed screen</Text>
    </View>
  );
}
```

### app/home/messages.tsx

```jsx
import { View, Text } from 'react-native';

export default function Messages() {
  return (
    <View>
      <Text>Messages screen</Text>
    </View>
  );
}
```

## Navigate to a screen in a nested navigator

In React Navigation, navigating to a specific nested screen can be controlled by passing the screen name in params. This renders the specified nested screen instead of the initial screen for that nested navigator.

For example, from the initial screen inside the root navigator, you want to navigate to a screen called media inside settings (a nested navigator). In React Navigation, this is done as shown in the example below:

### React Navigation

```jsx
navigation.navigate('root', {
  screen: 'settings',
  params: {
    screen: 'media',
  },
});
```

In Expo Router, you can use `router.push()` to achieve the same result. There is no need to pass the screen name in the params explicitly.

### Expo Router

```jsx
router.push('/root/settings/media');
```