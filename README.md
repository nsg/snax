<div align="center">
  <h1>snax</h1>
  <p>A browser-only alternative view of your snaps on the Snap Store.</p>

[![AI usage: mostly](https://nsg.github.io/aibadge/mostly.svg)](https://nsg.github.io/aibadge/#mostly)
</div>

snax is a static publisher dashboard that talks directly to the Snap Store dashboard API. The first step provides token-based login and a minimal account view.

## Run locally

```sh
npm install
npm run dev
```

Build the static site with:

```sh
npm run build
```

## Log in

Run `snapcraft export-login`, then paste the exported credentials into the login page. snax validates the token with the Snap Store before showing your account.

## Security

Your token is stored in your browser's local storage. It is only ever sent to `dashboard.snapcraft.io`; use **Log out** to delete it from the browser.
