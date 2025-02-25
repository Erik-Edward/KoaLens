# Overview of Linking, Deep Links, Android App Links, and iOS Universal Links

An overview of available resources to implement Linking and Deep Links in your Expo apps.

## Linking

Linking allows your app to interact with incoming and outgoing URLs. In this process, the user not only gets directed to open your app, but they are taken to a specific screen (route) within the app.

### Linking strategies

There are different linking strategies you handle in your Expo app:

- Linking to your app using your web domain links (universal linking using the `https` or `http` scheme)
- Linking to your app from other apps or websites using a custom scheme (deep links)
- Linking to other apps from your app (outgoing links)

> **Tip**: Support for incoming links in Expo Go is limited. We recommend using Development builds to test your app's linking strategies.

## Universal linking

Both Android and iOS implement their own systems for routing web URLs to an app if the app is installed. On Android, this system is called App Links, and on iOS it is called Universal Links. The pre-requisite for both systems is that you have a web domain where you can host a file which verifies you control the domain.

### Android App Links

Android App Links are different from standard deep links as they use regular HTTP and HTTPS schemes and are exclusive to Android devices.

This link type allows your app to always open when a user clicks the link instead of choosing between the browser or another handler from a dialog displayed on the device. If the user doesn't have your app installed, the link takes them to your app's associated website.

### iOS Universal Links

iOS Universal Links are different from standard deep links as they use regular HTTP and HTTPS schemes and are exclusive to iOS devices.

This link type allows your app to open when a user clicks an HTTP(S) link pointing to your web domain. If the user doesn't have your app installed, the link takes them to your app's associated website. You can further configure the website by displaying a banner for the user to open your app using Apple Smart Banner.

## Linking to your app from other apps or websites

Deep Links are links to a specific URL-based content inside an app or a website.

For example, by clicking a product advertisement, your app will open on the user's device and they can view that product's details. This product's link that the user clicked may look like (or alternatively be invoked by JavaScript with setting `window.location.href`):

```html
<a href="myapp://web-app.com/product">View Product</a>
```

This link is constructed by three parts:

- **Scheme**: The URL scheme that identifies the app that should open the URL (example: `myapp://`). It can also be `https` or `http` for non-standard deep links. We recommend universal linking for http(s)-based deep links.
- **Host**: The domain name of the app that should open the URL (example: `web-app.com`).
- **Path**: The path to the screen that should be opened (example: `/product`). If the path isn't specified, the user is taken to the home screen of the app.

## Use Expo Router to handle deep linking

To implement any of the above Linking strategies, we recommend using Expo Router since deep linking is automatically enabled for all of your app's screens.

### Benefits:
- `Link` component from Expo Router can be used to handle URL schemes to other apps
- Android App Links and iOS Universal Links require configuring runtime routing in JavaScript for the link in your app. Using Expo Router, you don't have to configure runtime routing separately since deep links for all routes are automatically enabled.

## Linking to other apps from your app

Linking to other apps from your app is achieved using a URL based on the target app's URL scheme. This URL scheme allows you to reference resources within that native app.

Your app can use a common URL scheme for default apps, including `https` and `http` (commonly used by web browsers like Chrome, Safari, and so on), and use JavaScript to invoke the URL that launches the corresponding native app.