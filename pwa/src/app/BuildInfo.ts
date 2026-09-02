declare const __APP_VERSION__: string;
declare const __BUILD_STAMP__: string;

/** Build metadata injected by Vite from the current release-stamp override. */
export const APP_VERSION: string = __APP_VERSION__;
export const BUILD_STAMP: string = __BUILD_STAMP__;
