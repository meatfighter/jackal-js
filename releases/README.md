# Releases

This directory is a staging area for intentionally published desktop artifacts.

Generated build folders such as `dist/` and `desktop/target/` remain ignored. Use this command when the Java desktop download should be refreshed:

```text
npm.cmd run release:desktop
```

The generated desktop zip is ignored by default so binary artifacts do not enter source control accidentally. Upload the zip to the release host, or force-add a specific version only when a committed binary is intentional.
