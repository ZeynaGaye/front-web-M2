// sockjs-client expects the Node.js `global` object, which the esbuild-based
// Angular builder no longer shims in the browser (unlike the old webpack builder).
// Without this, importing sockjs-client throws "ReferenceError: global is not defined"
// during client bootstrap, which aborts hydration and leaves the whole app unresponsive.
// This file also runs in the SSR (Node) bundle, where `global` already exists, so guard it.
if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis;
}
