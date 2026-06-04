// react-dom doesn't exist in React Native.
// Clerk's web package imports it for portal support which is never used on mobile.
// This stub prevents the bundler from crashing.
module.exports = {
  createPortal: (children) => children,
  render:                    () => {},
  unmountComponentAtNode:    () => {},
  findDOMNode:               () => null,
  flushSync:                 (fn) => fn(),
};
