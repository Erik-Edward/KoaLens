# Expo Router UI

An Expo Router submodule that provides headless tab components to create custom tab layouts.

**Android** | **iOS** | **tvOS** | **Web**

expo-router/ui is a submodule of expo-router library and exports components and hooks to build custom tab layouts, rather than using the default [React Navigation](https://reactnavigation.org/) navigators provided by expo-router.

See the [Expo Router](https://docs.expo.dev/versions/latest/sdk/router/) reference for more information about the file-based routing library for native and web app.

## Installation

```bash
npx expo install expo-router
```

## Configuration in app config

If you are using the [default](https://docs.expo.dev/more/create-expo/#--template) template to create a new project, expo-router [config plugin](https://docs.expo.dev/config-plugins/introduction/) is automatically configured in the app config automatically.

### Example app.json with config plugin

```json
{
  "expo": {
    "plugins": ["expo-router"]
  }
}
```

## Usage

Find more information about using expo-router/ui in [Expo Router UI](https://docs.expo.dev/router/advanced/custom-tabs/) guide.

## API

```jsx
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
```

## Components

### TabList

**Android** | **iOS** | **tvOS** | **Web**

Type: React.Element<[TabListProps](#tablistprops)>

Wrapper component for TabTriggers. TabTriggers within the TabList define the tabs.

**Example**

```jsx
<Tabs>
  <TabSlot />
  <TabList>
    <TabTrigger name="home" href="/" />
  </TabList>
</Tabs>
```

#### TabListProps

##### asChild

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: boolean

Forward props to child component and removes the extra `<View>`. Useful for custom wrappers.

#### Inherited Props

- [ViewProps](https://reactnative.dev/docs/view#props)

### Tabs

**Android** | **iOS** | **tvOS** | **Web**

Type: React.Element<[TabsProps](#tabsprops)>

Root component for the headless tabs.

See: [useTabsWithChildren](#usetabswithchildrenoptions) for a hook version of this component.

**Example**

```jsx
<Tabs>
  <TabSlot />
  <TabList>
    <TabTrigger name="home" href="/" />
  </TabList>
</Tabs>
```

#### TabsProps

##### asChild

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: boolean

Forward props to child component and removes the extra `<View>`. Useful for custom wrappers.

##### options

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: [UseTabsOptions](#usetabsoptions)

#### Inherited Props

- [ViewProps](https://reactnative.dev/docs/view#props)

### TabSlot

**Android** | **iOS** | **tvOS** | **Web**

Type: React.Element<[TabSlotProps](#tabslotprops)>

Renders the current tab.

See: [useTabSlot](#usetabslot) for a hook version of this component.

**Example**

```jsx
<Tabs>
  <TabSlot />
  <TabList>
    <TabTrigger name="home" href="/" />
  </TabList>
</Tabs>
```

#### TabSlotProps

##### detachInactiveScreens

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: boolean

Remove inactive screens.

##### renderFn

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: defaultTabsSlotRender

Override how the Screen component is rendered.

#### Inherited Props

- ComponentProps<ScreenContainer>

### TabTrigger

**Android** | **iOS** | **tvOS** | **Web**

Type: React.Element<[TabTriggerProps](#tabtriggerprops)>

Creates a trigger to navigate to a tab. When used as child of TabList, its functionality slightly changes since the href prop is required, and the trigger also defines what routes are present in the Tabs.

When used outside of TabList, this component no longer requires an href.

**Example**

```jsx
<Tabs>
  <TabSlot />
  <TabList>
    <TabTrigger name="home" href="/" />
  </TabList>
</Tabs>
```

#### TabTriggerProps

##### asChild

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: boolean

Forward props to child component. Useful for custom wrappers.

##### href

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: [Href](#href)

Name of tab. Required when used within a TabList.

##### name

**Android** | **iOS** | **tvOS** | **Web**

Type: string

Name of tab. When used within a TabList this sets the name of the tab. Otherwise, this references the name.

##### reset

**Android** | **iOS** | **tvOS** | **Web**

Optional • Type: SwitchToOptions[reset] | 'onLongPress'

Resets the route when switching to a tab.

#### Inherited Props

- [PressablePropsWithoutFunctionChildren](#pressablepropswithoutfunctionchildren)

### useTabSlot

**Android** | **iOS** | **tvOS** | **Web**

Type: React.Element<[TabSlotProps](#tabslotprops)>

Returns a ReactElement of the current tab.

**Example**

```jsx
function MyTabSlot() {
  const slot = useTabSlot();
  return slot;
}
```

## Constants

### Tabs.TabContext

**Android** | **iOS** | **tvOS** | **Web**

Type: [Context](#context)<[ExpoTabsNavigatorScreenOptions](#expotabsnavigatorscreenoptions)>

## Hooks

### useTabSlot(namedParameters)

**Android** | **iOS** | **tvOS** | **Web**

| Parameter | Type |
|-----------|------|
| namedParameters (optional) | [TabSlotProps](#tabslotprops) |

Returns a ReactElement of the current tab.

Returns: [Element](https://www.typescriptlang.org/docs/handbook/jsx.html#function-component)

**Example**

```jsx
function MyTabSlot() {
  const slot = useTabSlot();
  return slot;
}
```

### useTabsWithChildren(options)

**Android** | **iOS** | **tvOS** | **Web**

| Parameter | Type |
|-----------|------|
| options | [UseTabsWithChildrenOptions](#usetabswithchildrenoptions) |

Hook version of Tabs. The returned NavigationContent component should be rendered.

See: [Tabs](#tabs) for the component version of this hook.

**Example**

```jsx
export function MyTabs({ children }) {
  const { NavigationContent } = useTabsWithChildren({ children })
  return <NavigationContent />
}
```

### useTabsWithTriggers(options)

**Android** | **iOS** | **tvOS** | **Web**

| Parameter | Type |
|-----------|------|
| options | [UseTabsWithTriggersOptions](#usetabswithtriggersoptions) |

Alternative hook version of Tabs that uses explicit triggers instead of children.

Returns: [TabsContextValue](#tabscontextvalue)

See: [Tabs](#tabs) for the component version of this hook.

**Example**

```jsx
export function MyTabs({ children }) {
  const { NavigationContent } = useTabsWithChildren({ triggers: [] })
  return <NavigationContent />
}
```

### useTabTrigger(options)

**Android** | **iOS** | **tvOS** | **Web**

| Parameter | Type |
|-----------|------|
| options | [TabTriggerProps](#tabtriggerprops) |

Utility hook creating custom TabTrigger.

Returns: [UseTabTriggerResult](#usetabtriggerresult)

## Types

### ExpoTabsNavigationProp

**Android** | **iOS** | **tvOS** | **Web**

Type: [NavigationProp](#navigationprop)<[ParamList](#paramlist), [RouteName](#routename), [NavigatorID](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators), [TabNavigationState](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators)<ParamListBase>, [ExpoTabsScreenOptions](#expotabsscreenoptions), [TabNavigationEventMap](#tabnavigationeventmap)>

### ExpoTabsNavigatorOptions

**Android** | **iOS** | **tvOS** | **Web**

Literal Type: multiple types

Acceptable values are: [DefaultNavigatorOptions](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators)<ParamListBase, string | undefined, [TabNavigationState](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators)<ParamListBase>, [ExpoTabsScreenOptions](#expotabsscreenoptions), [TabNavigationEventMap](#tabnavigationeventmap), [ExpoTabsNavigationProp](#expotabsnavigationprop)<ParamListBase>> | [Omit](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)<[TabRouterOptions](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators), 'initialRouteName'> | [ExpoTabsNavigatorScreenOptions](#expotabsnavigatorscreenoptions)

### ExpoTabsNavigatorScreenOptions

**Android** | **iOS** | **tvOS** | **Web**

| Property | Type | Description |
|----------|------|-------------|
| detachInactiveScreens (optional) | boolean | - |
| freezeOnBlur (optional) | boolean | - |
| lazy (optional) | boolean | - |
| unmountOnBlur (optional) | boolean | - |

### ExpoTabsResetValue

**Android** | **iOS** | **tvOS** | **Web**

Literal Type: string

Acceptable values are: 'always' | 'onFocus' | 'never'

### ExpoTabsScreenOptions

**Android** | **iOS** | **tvOS** | **Web**

Type: [Pick](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys)<[BottomTabNavigationOptions](#bottomtabnavigationoptions), 'title' | 'lazy' | 'freezeOnBlur'> extended by:

| Property | Type | Description |
|----------|------|-------------|
| action | [NavigationAction](#navigationaction) | - |
| params (optional) | object | - |
| title | string | - |

### SwitchToOptions

**Android** | **iOS** | **tvOS** | **Web**

Options for switchTab function.

| Property | Type | Description |
|----------|------|-------------|
| reset (optional) | [ExpoTabsResetValue](#expotabsresetvalue) | Navigate and reset the history. |

### TabNavigationEventMap

**Android** | **iOS** | **tvOS** | **Web**

| Property | Type | Description |
|----------|------|-------------|
| tabLongPress | { data: undefined } | Event which fires on long press on the tab in the tab bar. |
| tabPress | { canPreventDefault: true, data: undefined } | Event which fires on tapping on the tab in the tab bar. |

### TabsContextValue

**Android** | **iOS** | **tvOS** | **Web**

Type: [ReturnType](#returntype)<useNavigationBuilder>

The React Navigation custom navigator.

See: [useNavigationBuilder](https://reactnavigation.org/docs/custom-navigators/#usenavigationbuilder) hook from React Navigation for more information.

### TabsSlotRenderOptions

**Android** | **iOS** | **tvOS** | **Web**

Options provided to the UseTabSlotOptions.

| Property | Type | Description |
|----------|------|-------------|
| detachInactiveScreens | boolean | Should the screen be unloaded when inactive. |
| index | number | Index of screen. |
| isFocused | boolean | Whether the screen is focused. |
| loaded | boolean | Whether the screen has been loaded. |

### TabTriggerOptions

**Android** | **iOS** | **tvOS** | **Web**

| Property | Type | Description |
|----------|------|-------------|
| href | [Href](#href) | - |
| name | string | - |

### Trigger

**Android** | **iOS** | **tvOS** | **Web**

Type: extended by:

| Property | Type | Description |
|----------|------|-------------|
| isFocused | boolean | - |
| resolvedHref | string | - |
| route | [number] | - |

### UseTabsOptions

**Android** | **iOS** | **tvOS** | **Web**

Options to provide to the Tab Router.

Type: [Omit](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)<[DefaultNavigatorOptions](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators)<ParamListBase, any, [TabNavigationState](https://reactnavigation.org/docs/custom-navigators/#type-checking-navigators)<any>, [ExpoTabsScreenOptions](#expotabsscreenoptions), [TabNavigationEventMap](#tabnavigationeventmap), any>, 'children'> extended by:

| Property | Type | Description |
|----------|------|-------------|
| backBehavior (optional) | TabRouterOptions[backBehavior] | - |

### UseTabsWithChildrenOptions

**Android** | **iOS** | **tvOS** | **Web**

Type: PropsWithChildren<[UseTabsOptions](#usetabsoptions)>

### UseTabsWithTriggersOptions

**Android** | **iOS** | **tvOS** | **Web**

Type: [UseTabsOptions](#usetabsoptions) extended by:

| Property | Type | Description |
|----------|------|-------------|
| triggers | [ScreenTrigger[]](#screentrigger) | - |

### UseTabTriggerResult

**Android** | **iOS** | **tvOS** | **Web**

| Property | Type | Description |
|----------|------|-------------|
| getTrigger | (name: string) => [Trigger](#trigger) \| undefined | - name: string |
| switchTab | (name: string, options: [SwitchToOptions](#switchtooptions)) => void | - name: string options: [SwitchToOptions](#switchtooptions) |
| trigger (optional) | [Trigger](#trigger) | - |
| triggerProps | [TriggerProps](#triggerprops) | - |