# jackal-js

PWA desktop-browser port of SlickJackal with a Java-shaped TypeScript gameplay port in `src/jackal` and a preserved Java desktop build in `desktop`.

## Web

```sh
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

The PWA version and cache stamp live in `version.json` and are mirrored into static files that browsers cache.

## Desktop Java

```sh
npm.cmd run build:desktop
npm.cmd run run:desktop
```

`desktop/src` preserves the Java desktop source and resources. The Maven/fallback desktop build is packaging support and should not be used as a source of new TypeScript gameplay behavior.

## License

Project code is licensed under GPL-3.0-or-later unless a file says otherwise. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
