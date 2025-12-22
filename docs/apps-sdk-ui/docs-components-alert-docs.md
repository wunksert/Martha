# components alert  docs

> Source: [https://openai.github.io/apps-sdk-ui/?path=/docs/components-alert--docs](https://openai.github.io/apps-sdk-ui/?path=/docs/components-alert--docs)
> Fetched: 2025-12-10T23:17:52.758Z

---

Name
Description
Default
Control
propertyName*
This is a short description
summary
defaultValue
Set string
propertyName*
This is a short description
summary
defaultValue
Set string
propertyName*
This is a short description
summary
defaultValue
Set string
# No PreviewSorry, but you either have no stories or none are selected somehow.- Please check the Storybook config.- Try reloading the page.
If the problem persists, check the browser console, or the terminal you've run Storybook from.
#
The component failed to render properly, likely due to a configuration issue in Storybook.
Here are some common causes and how you can address them:
**Missing Context/Providers**: You can use decorators to supply specific
contexts or providers, which are sometimes necessary for components to render correctly. For
detailed instructions on using decorators, please visit the
Decorators documentation.
**Misconfigured Webpack or Vite**: Verify that Storybook picks up all necessary
settings for loaders, plugins, and other relevant parameters. You can find step-by-step
guides for configuring
[Webpack](https://storybook.js.org/docs/builders/webpack) or
[Vite](https://storybook.js.org/docs/builders/vite)
with Storybook.
**Missing Environment Variables**: Your Storybook may require specific
environment variables to function as intended. You can set up custom environment variables
as outlined in the
Environment Variables documentation.``````
