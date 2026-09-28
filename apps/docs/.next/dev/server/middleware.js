"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "proxy";
exports.ids = ["proxy"];
exports.modules = {

/***/ "(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs%2Fsrc%2Fproxy.js&page=%2Fproxy&rootDir=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs&matchers=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs%2Fsrc%2Fproxy.js&page=%2Fproxy&rootDir=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs&matchers=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__),\n/* harmony export */   handler: () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var next_dist_build_adapter_setup_node_env_external__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/build/adapter/setup-node-env.external */ \"next/dist/build/adapter/setup-node-env.external\");\n/* harmony import */ var next_dist_build_adapter_setup_node_env_external__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_build_adapter_setup_node_env_external__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/web/globals */ \"(middleware)/./node_modules/next/dist/server/web/globals.js\");\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/web/adapter */ \"(middleware)/./node_modules/next/dist/server/web/adapter.js\");\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var next_dist_server_lib_incremental_cache__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/dist/server/lib/incremental-cache */ \"(middleware)/./node_modules/next/dist/server/lib/incremental-cache/index.js\");\n/* harmony import */ var next_dist_server_lib_incremental_cache__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_incremental_cache__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _src_proxy_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./src/proxy.js */ \"(middleware)/./src/proxy.js\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! next/dist/client/components/is-next-router-error */ \"(middleware)/./node_modules/next/dist/client/components/is-next-router-error.js\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! next/dist/server/web/utils */ \"(middleware)/./node_modules/next/dist/server/web/utils.js\");\n/* harmony import */ var next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_6__);\n\n\n\n\nconst incrementalCacheHandler = null\n// Import the userland code.\n;\n\n\n\nconst mod = {\n    ..._src_proxy_js__WEBPACK_IMPORTED_MODULE_4__\n};\nconst page = \"/proxy\";\nconst isProxy = page === '/proxy' || page === '/src/proxy';\nconst handlerUserland = (isProxy ? mod.proxy : mod.middleware) || mod.default;\nclass ProxyMissingExportError extends Error {\n    constructor(message){\n        super(message);\n        Object.defineProperty(this, \"__NEXT_ERROR_CODE\", {\n            value: \"E394\",\n            enumerable: false,\n            configurable: true\n        });\n        // Stack isn't useful here, remove it considering it spams logs during development.\n        this.stack = '';\n    }\n}\n// TODO: This spams logs during development. Find a better way to handle this.\n// Removing this will spam \"fn is not a function\" logs which is worse.\nif (typeof handlerUserland !== 'function') {\n    throw new ProxyMissingExportError(`The ${isProxy ? 'Proxy' : 'Middleware'} file \"${page}\" must export a function named \\`${isProxy ? 'proxy' : 'middleware'}\\` or a default function.`);\n}\n// Proxy will only sent out the FetchEvent to next server,\n// so load instrumentation module here and track the error inside proxy module.\nfunction errorHandledHandler(fn) {\n    return async (...args)=>{\n        try {\n            return await fn(...args);\n        } catch (err) {\n            // In development, error the navigation API usage in runtime,\n            // since it's not allowed to be used in proxy as it's outside of react component tree.\n            if (true) {\n                if ((0,next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_5__.isNextRouterError)(err)) {\n                    err.message = `Next.js navigation API is not allowed to be used in ${isProxy ? 'Proxy' : 'Middleware'}.`;\n                    throw err;\n                }\n            }\n            const req = args[0];\n            const url = new URL(req.url);\n            const resource = url.pathname + url.search;\n            await (0,next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_1__.edgeInstrumentationOnRequestError)(err, {\n                path: resource,\n                method: req.method,\n                headers: Object.fromEntries(req.headers.entries())\n            }, {\n                routerKind: 'Pages Router',\n                routePath: '/proxy',\n                routeType: 'proxy',\n                revalidateReason: undefined\n            });\n            throw err;\n        }\n    };\n}\nconst internalHandler = async (opts)=>{\n    if (true) {\n        var _opts_request_requestMeta, _opts_request_requestMeta1;\n        // This mirrors what `RouteModule#prepare` does for routes\n        // edge runtime handles loading instrumentation at the edge adapter level\n        const { join, relative } = __webpack_require__(/*! node:path */ \"node:path\");\n        const { ensureInstrumentationRegistered } = __webpack_require__(/*! next/dist/server/lib/router-utils/instrumentation-globals.external */ \"next/dist/server/lib/router-utils/instrumentation-globals.external\");\n        const absoluteProjectDir = join(/* turbopackIgnore: true */ process.cwd(), ((_opts_request_requestMeta = opts.request.requestMeta) == null ? void 0 : _opts_request_requestMeta.relativeProjectDir) || '');\n        const absoluteDistDir = (_opts_request_requestMeta1 = opts.request.requestMeta) == null ? void 0 : _opts_request_requestMeta1.distDir;\n        const distDir = absoluteDistDir ? relative(absoluteProjectDir, absoluteDistDir) : '.next';\n        await ensureInstrumentationRegistered(absoluteProjectDir, distDir);\n    }\n    return (0,next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_2__.adapter)({\n        ...opts,\n        IncrementalCache: next_dist_server_lib_incremental_cache__WEBPACK_IMPORTED_MODULE_3__.IncrementalCache,\n        incrementalCacheHandler,\n        page,\n        handler: errorHandledHandler(handlerUserland)\n    });\n};\nasync function handler(request, ctx) {\n    const result = await internalHandler({\n        request: {\n            url: request.url,\n            method: request.method,\n            headers: (0,next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_6__.toNodeOutgoingHttpHeaders)(request.headers),\n            nextConfig: {\n                basePath: \"\",\n                i18n: \"\",\n                trailingSlash: Boolean(false),\n                experimental: {\n                    cacheLife: {\"default\":{\"stale\":300,\"revalidate\":900,\"expire\":4294967294},\"seconds\":{\"stale\":30,\"revalidate\":1,\"expire\":60},\"minutes\":{\"stale\":300,\"revalidate\":60,\"expire\":3600},\"hours\":{\"stale\":300,\"revalidate\":3600,\"expire\":86400},\"days\":{\"stale\":300,\"revalidate\":86400,\"expire\":604800},\"weeks\":{\"stale\":300,\"revalidate\":604800,\"expire\":2592000},\"max\":{\"stale\":300,\"revalidate\":2592000,\"expire\":31536000}},\n                    authInterrupts: Boolean(false),\n                    clientParamParsingOrigins: []\n                }\n            },\n            page: {\n                name: page\n            },\n            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body ?? undefined : undefined,\n            waitUntil: ctx.waitUntil,\n            requestMeta: ctx.requestMeta,\n            signal: ctx.signal || new AbortController().signal\n        }\n    });\n    ctx.waitUntil == null ? void 0 : ctx.waitUntil.call(ctx, result.waitUntil);\n    return result.response;\n}\n// backwards compat for non-adapter setups\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (internalHandler);\n\n//# sourceMappingURL=middleware.js.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1taWRkbGV3YXJlLWxvYWRlci5qcz9hYnNvbHV0ZVBhZ2VQYXRoPSUyRlVzZXJzJTJGdmlkdXNoaXNheGVuYSUyRkRvY3VtZW50cyUyRkdpdEh1YiUyRnZhdWx0LW5ldyUyRmFwcHMlMkZkb2NzJTJGc3JjJTJGcHJveHkuanMmcGFnZT0lMkZwcm94eSZyb290RGlyPSUyRlVzZXJzJTJGdmlkdXNoaXNheGVuYSUyRkRvY3VtZW50cyUyRkdpdEh1YiUyRnZhdWx0LW5ldyUyRmFwcHMlMkZkb2NzJm1hdGNoZXJzPSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBeUQ7QUFDbkI7QUFDaUI7QUFDbUI7QUFDMUU7QUFDQTtBQUNBLENBQXVDO0FBQzBDO0FBQ0k7QUFDZDtBQUN2RTtBQUNBLE9BQU8sMENBQUk7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkNBQTZDLGtDQUFrQyxRQUFRLEtBQUssbUNBQW1DLGlDQUFpQztBQUNoSztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0EsZ0JBQWdCLElBQXFDO0FBQ3JELG9CQUFvQixtR0FBaUI7QUFDckMseUZBQXlGLGlDQUFpQztBQUMxSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsK0ZBQWlDO0FBQ25EO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFtQztBQUMzQztBQUNBO0FBQ0E7QUFDQSxnQkFBZ0IsaUJBQWlCLEVBQUUsbUJBQU8sQ0FBQyw0QkFBVztBQUN0RCxnQkFBZ0Isa0NBQWtDLEVBQUUsbUJBQU8sQ0FBQyw4SUFBb0U7QUFDaEk7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcscUVBQU87QUFDbEI7QUFDQSx3QkFBd0I7QUFDeEI7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQixxRkFBeUI7QUFDOUM7QUFDQSwwQkFBMEIsRUFBNEI7QUFDdEQsc0JBQXNCLEVBQThCO0FBQ3BELHVDQUF1QyxLQUFpQztBQUN4RTtBQUNBLCtCQUErQiwyWUFBNkI7QUFDNUQsNENBQTRDLEtBQStDO0FBQzNGLCtDQUErQyxFQUErQztBQUM5RjtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpRUFBZSxlQUFlLEVBQUM7O0FBRS9CIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFwibmV4dC9kaXN0L2J1aWxkL2FkYXB0ZXIvc2V0dXAtbm9kZS1lbnYuZXh0ZXJuYWxcIjtcbmltcG9ydCBcIm5leHQvZGlzdC9zZXJ2ZXIvd2ViL2dsb2JhbHNcIjtcbmltcG9ydCB7IGFkYXB0ZXIgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci93ZWIvYWRhcHRlclwiO1xuaW1wb3J0IHsgSW5jcmVtZW50YWxDYWNoZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9pbmNyZW1lbnRhbC1jYWNoZVwiO1xuY29uc3QgaW5jcmVtZW50YWxDYWNoZUhhbmRsZXIgPSBudWxsXG4vLyBJbXBvcnQgdGhlIHVzZXJsYW5kIGNvZGUuXG5pbXBvcnQgKiBhcyBfbW9kIGZyb20gXCIuL3NyYy9wcm94eS5qc1wiO1xuaW1wb3J0IHsgZWRnZUluc3RydW1lbnRhdGlvbk9uUmVxdWVzdEVycm9yIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvd2ViL2dsb2JhbHNcIjtcbmltcG9ydCB7IGlzTmV4dFJvdXRlckVycm9yIH0gZnJvbSBcIm5leHQvZGlzdC9jbGllbnQvY29tcG9uZW50cy9pcy1uZXh0LXJvdXRlci1lcnJvclwiO1xuaW1wb3J0IHsgdG9Ob2RlT3V0Z29pbmdIdHRwSGVhZGVycyB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3dlYi91dGlsc1wiO1xuY29uc3QgbW9kID0ge1xuICAgIC4uLl9tb2Rcbn07XG5jb25zdCBwYWdlID0gXCIvcHJveHlcIjtcbmNvbnN0IGlzUHJveHkgPSBwYWdlID09PSAnL3Byb3h5JyB8fCBwYWdlID09PSAnL3NyYy9wcm94eSc7XG5jb25zdCBoYW5kbGVyVXNlcmxhbmQgPSAoaXNQcm94eSA/IG1vZC5wcm94eSA6IG1vZC5taWRkbGV3YXJlKSB8fCBtb2QuZGVmYXVsdDtcbmNsYXNzIFByb3h5TWlzc2luZ0V4cG9ydEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKG1lc3NhZ2Upe1xuICAgICAgICBzdXBlcihtZXNzYWdlKTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiX19ORVhUX0VSUk9SX0NPREVcIiwge1xuICAgICAgICAgICAgdmFsdWU6IFwiRTM5NFwiLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFN0YWNrIGlzbid0IHVzZWZ1bCBoZXJlLCByZW1vdmUgaXQgY29uc2lkZXJpbmcgaXQgc3BhbXMgbG9ncyBkdXJpbmcgZGV2ZWxvcG1lbnQuXG4gICAgICAgIHRoaXMuc3RhY2sgPSAnJztcbiAgICB9XG59XG4vLyBUT0RPOiBUaGlzIHNwYW1zIGxvZ3MgZHVyaW5nIGRldmVsb3BtZW50LiBGaW5kIGEgYmV0dGVyIHdheSB0byBoYW5kbGUgdGhpcy5cbi8vIFJlbW92aW5nIHRoaXMgd2lsbCBzcGFtIFwiZm4gaXMgbm90IGEgZnVuY3Rpb25cIiBsb2dzIHdoaWNoIGlzIHdvcnNlLlxuaWYgKHR5cGVvZiBoYW5kbGVyVXNlcmxhbmQgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgUHJveHlNaXNzaW5nRXhwb3J0RXJyb3IoYFRoZSAke2lzUHJveHkgPyAnUHJveHknIDogJ01pZGRsZXdhcmUnfSBmaWxlIFwiJHtwYWdlfVwiIG11c3QgZXhwb3J0IGEgZnVuY3Rpb24gbmFtZWQgXFxgJHtpc1Byb3h5ID8gJ3Byb3h5JyA6ICdtaWRkbGV3YXJlJ31cXGAgb3IgYSBkZWZhdWx0IGZ1bmN0aW9uLmApO1xufVxuLy8gUHJveHkgd2lsbCBvbmx5IHNlbnQgb3V0IHRoZSBGZXRjaEV2ZW50IHRvIG5leHQgc2VydmVyLFxuLy8gc28gbG9hZCBpbnN0cnVtZW50YXRpb24gbW9kdWxlIGhlcmUgYW5kIHRyYWNrIHRoZSBlcnJvciBpbnNpZGUgcHJveHkgbW9kdWxlLlxuZnVuY3Rpb24gZXJyb3JIYW5kbGVkSGFuZGxlcihmbikge1xuICAgIHJldHVybiBhc3luYyAoLi4uYXJncyk9PntcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBmbiguLi5hcmdzKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBJbiBkZXZlbG9wbWVudCwgZXJyb3IgdGhlIG5hdmlnYXRpb24gQVBJIHVzYWdlIGluIHJ1bnRpbWUsXG4gICAgICAgICAgICAvLyBzaW5jZSBpdCdzIG5vdCBhbGxvd2VkIHRvIGJlIHVzZWQgaW4gcHJveHkgYXMgaXQncyBvdXRzaWRlIG9mIHJlYWN0IGNvbXBvbmVudCB0cmVlLlxuICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOZXh0Um91dGVyRXJyb3IoZXJyKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnIubWVzc2FnZSA9IGBOZXh0LmpzIG5hdmlnYXRpb24gQVBJIGlzIG5vdCBhbGxvd2VkIHRvIGJlIHVzZWQgaW4gJHtpc1Byb3h5ID8gJ1Byb3h5JyA6ICdNaWRkbGV3YXJlJ30uYDtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlcSA9IGFyZ3NbMF07XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2UgPSB1cmwucGF0aG5hbWUgKyB1cmwuc2VhcmNoO1xuICAgICAgICAgICAgYXdhaXQgZWRnZUluc3RydW1lbnRhdGlvbk9uUmVxdWVzdEVycm9yKGVyciwge1xuICAgICAgICAgICAgICAgIHBhdGg6IHJlc291cmNlLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogcmVxLm1ldGhvZCxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiBPYmplY3QuZnJvbUVudHJpZXMocmVxLmhlYWRlcnMuZW50cmllcygpKVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHJvdXRlcktpbmQ6ICdQYWdlcyBSb3V0ZXInLFxuICAgICAgICAgICAgICAgIHJvdXRlUGF0aDogJy9wcm94eScsXG4gICAgICAgICAgICAgICAgcm91dGVUeXBlOiAncHJveHknLFxuICAgICAgICAgICAgICAgIHJldmFsaWRhdGVSZWFzb246IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICB9O1xufVxuY29uc3QgaW50ZXJuYWxIYW5kbGVyID0gYXN5bmMgKG9wdHMpPT57XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5FWFRfUlVOVElNRSAhPT0gJ2VkZ2UnKSB7XG4gICAgICAgIHZhciBfb3B0c19yZXF1ZXN0X3JlcXVlc3RNZXRhLCBfb3B0c19yZXF1ZXN0X3JlcXVlc3RNZXRhMTtcbiAgICAgICAgLy8gVGhpcyBtaXJyb3JzIHdoYXQgYFJvdXRlTW9kdWxlI3ByZXBhcmVgIGRvZXMgZm9yIHJvdXRlc1xuICAgICAgICAvLyBlZGdlIHJ1bnRpbWUgaGFuZGxlcyBsb2FkaW5nIGluc3RydW1lbnRhdGlvbiBhdCB0aGUgZWRnZSBhZGFwdGVyIGxldmVsXG4gICAgICAgIGNvbnN0IHsgam9pbiwgcmVsYXRpdmUgfSA9IHJlcXVpcmUoJ25vZGU6cGF0aCcpO1xuICAgICAgICBjb25zdCB7IGVuc3VyZUluc3RydW1lbnRhdGlvblJlZ2lzdGVyZWQgfSA9IHJlcXVpcmUoXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9yb3V0ZXItdXRpbHMvaW5zdHJ1bWVudGF0aW9uLWdsb2JhbHMuZXh0ZXJuYWxcIik7XG4gICAgICAgIGNvbnN0IGFic29sdXRlUHJvamVjdERpciA9IGpvaW4oLyogdHVyYm9wYWNrSWdub3JlOiB0cnVlICovIHByb2Nlc3MuY3dkKCksICgoX29wdHNfcmVxdWVzdF9yZXF1ZXN0TWV0YSA9IG9wdHMucmVxdWVzdC5yZXF1ZXN0TWV0YSkgPT0gbnVsbCA/IHZvaWQgMCA6IF9vcHRzX3JlcXVlc3RfcmVxdWVzdE1ldGEucmVsYXRpdmVQcm9qZWN0RGlyKSB8fCAnJyk7XG4gICAgICAgIGNvbnN0IGFic29sdXRlRGlzdERpciA9IChfb3B0c19yZXF1ZXN0X3JlcXVlc3RNZXRhMSA9IG9wdHMucmVxdWVzdC5yZXF1ZXN0TWV0YSkgPT0gbnVsbCA/IHZvaWQgMCA6IF9vcHRzX3JlcXVlc3RfcmVxdWVzdE1ldGExLmRpc3REaXI7XG4gICAgICAgIGNvbnN0IGRpc3REaXIgPSBhYnNvbHV0ZURpc3REaXIgPyByZWxhdGl2ZShhYnNvbHV0ZVByb2plY3REaXIsIGFic29sdXRlRGlzdERpcikgOiAnLm5leHQnO1xuICAgICAgICBhd2FpdCBlbnN1cmVJbnN0cnVtZW50YXRpb25SZWdpc3RlcmVkKGFic29sdXRlUHJvamVjdERpciwgZGlzdERpcik7XG4gICAgfVxuICAgIHJldHVybiBhZGFwdGVyKHtcbiAgICAgICAgLi4ub3B0cyxcbiAgICAgICAgSW5jcmVtZW50YWxDYWNoZSxcbiAgICAgICAgaW5jcmVtZW50YWxDYWNoZUhhbmRsZXIsXG4gICAgICAgIHBhZ2UsXG4gICAgICAgIGhhbmRsZXI6IGVycm9ySGFuZGxlZEhhbmRsZXIoaGFuZGxlclVzZXJsYW5kKVxuICAgIH0pO1xufTtcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcXVlc3QsIGN0eCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGludGVybmFsSGFuZGxlcih7XG4gICAgICAgIHJlcXVlc3Q6IHtcbiAgICAgICAgICAgIHVybDogcmVxdWVzdC51cmwsXG4gICAgICAgICAgICBtZXRob2Q6IHJlcXVlc3QubWV0aG9kLFxuICAgICAgICAgICAgaGVhZGVyczogdG9Ob2RlT3V0Z29pbmdIdHRwSGVhZGVycyhyZXF1ZXN0LmhlYWRlcnMpLFxuICAgICAgICAgICAgbmV4dENvbmZpZzoge1xuICAgICAgICAgICAgICAgIGJhc2VQYXRoOiBwcm9jZXNzLmVudi5fX05FWFRfQkFTRV9QQVRILFxuICAgICAgICAgICAgICAgIGkxOG46IHByb2Nlc3MuZW52Ll9fTkVYVF9JMThOX0NPTkZJRyxcbiAgICAgICAgICAgICAgICB0cmFpbGluZ1NsYXNoOiBCb29sZWFuKHByb2Nlc3MuZW52Ll9fTkVYVF9UUkFJTElOR19TTEFTSCksXG4gICAgICAgICAgICAgICAgZXhwZXJpbWVudGFsOiB7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlTGlmZTogcHJvY2Vzcy5lbnYuX19ORVhUX0NBQ0hFX0xJRkUsXG4gICAgICAgICAgICAgICAgICAgIGF1dGhJbnRlcnJ1cHRzOiBCb29sZWFuKHByb2Nlc3MuZW52Ll9fTkVYVF9FWFBFUklNRU5UQUxfQVVUSF9JTlRFUlJVUFRTKSxcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50UGFyYW1QYXJzaW5nT3JpZ2luczogcHJvY2Vzcy5lbnYuX19ORVhUX0NMSUVOVF9QQVJBTV9QQVJTSU5HX09SSUdJTlNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnZToge1xuICAgICAgICAgICAgICAgIG5hbWU6IHBhZ2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBib2R5OiByZXF1ZXN0Lm1ldGhvZCAhPT0gJ0dFVCcgJiYgcmVxdWVzdC5tZXRob2QgIT09ICdIRUFEJyA/IHJlcXVlc3QuYm9keSA/PyB1bmRlZmluZWQgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB3YWl0VW50aWw6IGN0eC53YWl0VW50aWwsXG4gICAgICAgICAgICByZXF1ZXN0TWV0YTogY3R4LnJlcXVlc3RNZXRhLFxuICAgICAgICAgICAgc2lnbmFsOiBjdHguc2lnbmFsIHx8IG5ldyBBYm9ydENvbnRyb2xsZXIoKS5zaWduYWxcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGN0eC53YWl0VW50aWwgPT0gbnVsbCA/IHZvaWQgMCA6IGN0eC53YWl0VW50aWwuY2FsbChjdHgsIHJlc3VsdC53YWl0VW50aWwpO1xuICAgIHJldHVybiByZXN1bHQucmVzcG9uc2U7XG59XG4vLyBiYWNrd2FyZHMgY29tcGF0IGZvciBub24tYWRhcHRlciBzZXR1cHNcbmV4cG9ydCBkZWZhdWx0IGludGVybmFsSGFuZGxlcjtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWlkZGxld2FyZS5qcy5tYXBcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs%2Fsrc%2Fproxy.js&page=%2Fproxy&rootDir=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs&matchers=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(middleware)/./src/proxy.js":
/*!**********************!*\
  !*** ./src/proxy.js ***!
  \**********************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   config: () => (/* binding */ config),\n/* harmony export */   \"default\": () => (/* binding */ middleware)\n/* harmony export */ });\n/* harmony import */ var _clerk_nextjs_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @clerk/nextjs/server */ \"(middleware)/./node_modules/@clerk/nextjs/dist/esm/server/routeMatcher.js\");\n/* harmony import */ var _clerk_nextjs_server__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @clerk/nextjs/server */ \"(middleware)/./node_modules/@clerk/nextjs/dist/esm/server/clerkMiddleware.js\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(middleware)/./node_modules/next/dist/api/server.js\");\n\n\nconst isProtectedRoute = (0,_clerk_nextjs_server__WEBPACK_IMPORTED_MODULE_1__.createRouteMatcher)([\n    \"/dashboard(.*)\",\n    \"/api/dashboard(.*)\",\n    \"/api/wishlist(.*)\",\n    // Not /api/razorpay/webhooks - Razorpay's server sends those with no Clerk\n    // session (auth.protect() would silently drop every delivery, as happened\n    // with Stripe webhooks before). That route authenticates itself via the\n    // X-Razorpay-Signature header instead.\n    \"/api/razorpay/create-order(.*)\",\n    \"/api/razorpay/create-subscription(.*)\",\n    \"/api/razorpay/verify-payment(.*)\"\n]);\n// Marketing pages render with no ClerkProvider and no Clerk hooks (see the\n// (marketing) route group), so there is nothing on these routes for Clerk\n// middleware to protect or hydrate against. Skipping clerkMiddleware here\n// avoids its session-verification work (and the stale-UAT handshake risk\n// below) on every visit to the pages that actually need to be fast.\nconst isMarketingRoute = (0,_clerk_nextjs_server__WEBPACK_IMPORTED_MODULE_1__.createRouteMatcher)([\n    \"/\",\n    \"/demo(.*)\"\n]);\nconst withClerk = (0,_clerk_nextjs_server__WEBPACK_IMPORTED_MODULE_2__.clerkMiddleware)(async (auth, request)=>{\n    if (isProtectedRoute(request)) {\n        await auth.protect();\n    }\n});\n// Strip stale __client_uat cookies before Clerk processes the request.\n// When the site ran with dev Clerk keys, browsers received a __client_uat\n// cookie issued by the dev instance. After switching to production keys,\n// Clerk middleware sees that UAT, can't match it to the production instance,\n// and injects a cross-instance handshake into the RSC payload - redirecting\n// even non-authenticated visitors to adequate-shad-61.clerk.accounts.dev.\n// Removing the orphaned UAT from the request before Clerk runs prevents this.\nasync function middleware(request) {\n    const host = request.headers.get(\"host\") || \"\";\n    if (host.startsWith(\"www.\")) {\n        const url = new URL(request.url);\n        url.host = host.replace(/^www\\./, \"\");\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(url.toString(), 301);\n    }\n    if (isMarketingRoute(request)) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n    }\n    const clientUat = request.cookies.get(\"__client_uat\")?.value;\n    const session = request.cookies.get(\"__session\")?.value;\n    if (clientUat && clientUat !== \"0\" && !session) {\n        const newHeaders = new Headers(request.headers);\n        const cleaned = (newHeaders.get(\"cookie\") || \"\").split(\";\").map((c)=>c.trim()).filter((c)=>!c.startsWith(\"__client_uat=\")).join(\"; \");\n        cleaned ? newHeaders.set(\"cookie\", cleaned) : newHeaders.delete(\"cookie\");\n        const cleanRequest = new next_server__WEBPACK_IMPORTED_MODULE_0__.NextRequest(request.url, {\n            method: request.method,\n            headers: newHeaders\n        });\n        const response = await withClerk(cleanRequest);\n        // Also tell the browser to zero out the stale cookie\n        const res = response ?? next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n        res.cookies.set(\"__client_uat\", \"0\", {\n            path: \"/\",\n            maxAge: 0,\n            secure: true,\n            sameSite: \"strict\"\n        });\n        return res;\n    }\n    return withClerk(request);\n}\nconst config = {\n    matcher: [\n        // Skip all internal paths and all static files, unless found in search params\n        '/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)',\n        // Always run for API routes\n        '/(api|trpc)(.*)'\n    ]\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vc3JjL3Byb3h5LmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQTJFO0FBQ25CO0FBRXhELE1BQU1JLG1CQUFtQkgsd0VBQWtCQSxDQUFDO0lBQzFDO0lBQ0E7SUFDQTtJQUNBLDJFQUEyRTtJQUMzRSwwRUFBMEU7SUFDMUUsd0VBQXdFO0lBQ3hFLHVDQUF1QztJQUN2QztJQUNBO0lBQ0E7Q0FDRDtBQUVELDJFQUEyRTtBQUMzRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLHlFQUF5RTtBQUN6RSxvRUFBb0U7QUFDcEUsTUFBTUksbUJBQW1CSix3RUFBa0JBLENBQUM7SUFDMUM7SUFDQTtDQUNEO0FBRUQsTUFBTUssWUFBWU4scUVBQWVBLENBQUMsT0FBT08sTUFBTUM7SUFDN0MsSUFBSUosaUJBQWlCSSxVQUFVO1FBQzdCLE1BQU1ELEtBQUtFLE9BQU87SUFDcEI7QUFDRjtBQUVBLHVFQUF1RTtBQUN2RSwwRUFBMEU7QUFDMUUseUVBQXlFO0FBQ3pFLDZFQUE2RTtBQUM3RSw0RUFBNEU7QUFDNUUsMEVBQTBFO0FBQzFFLDhFQUE4RTtBQUMvRCxlQUFlQyxXQUFXRixPQUFPO0lBQzlDLE1BQU1HLE9BQU9ILFFBQVFJLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDLFdBQVc7SUFDNUMsSUFBSUYsS0FBS0csVUFBVSxDQUFDLFNBQVM7UUFDM0IsTUFBTUMsTUFBTSxJQUFJQyxJQUFJUixRQUFRTyxHQUFHO1FBQy9CQSxJQUFJSixJQUFJLEdBQUdBLEtBQUtNLE9BQU8sQ0FBQyxVQUFVO1FBQ2xDLE9BQU9kLHFEQUFZQSxDQUFDZSxRQUFRLENBQUNILElBQUlJLFFBQVEsSUFBSTtJQUMvQztJQUVBLElBQUlkLGlCQUFpQkcsVUFBVTtRQUM3QixPQUFPTCxxREFBWUEsQ0FBQ2lCLElBQUk7SUFDMUI7SUFFQSxNQUFNQyxZQUFZYixRQUFRYyxPQUFPLENBQUNULEdBQUcsQ0FBQyxpQkFBaUJVO0lBQ3ZELE1BQU1DLFVBQVVoQixRQUFRYyxPQUFPLENBQUNULEdBQUcsQ0FBQyxjQUFjVTtJQUVsRCxJQUFJRixhQUFhQSxjQUFjLE9BQU8sQ0FBQ0csU0FBUztRQUM5QyxNQUFNQyxhQUFhLElBQUlDLFFBQVFsQixRQUFRSSxPQUFPO1FBQzlDLE1BQU1lLFVBQVUsQ0FBQ0YsV0FBV1osR0FBRyxDQUFDLGFBQWEsRUFBQyxFQUMzQ2UsS0FBSyxDQUFDLEtBQ05DLEdBQUcsQ0FBQyxDQUFDQyxJQUFNQSxFQUFFQyxJQUFJLElBQ2pCQyxNQUFNLENBQUMsQ0FBQ0YsSUFBTSxDQUFDQSxFQUFFaEIsVUFBVSxDQUFDLGtCQUM1Qm1CLElBQUksQ0FBQztRQUNSTixVQUNJRixXQUFXUyxHQUFHLENBQUMsVUFBVVAsV0FDekJGLFdBQVdVLE1BQU0sQ0FBQztRQUV0QixNQUFNQyxlQUFlLElBQUlsQyxvREFBV0EsQ0FBQ00sUUFBUU8sR0FBRyxFQUFFO1lBQ2hEc0IsUUFBUTdCLFFBQVE2QixNQUFNO1lBQ3RCekIsU0FBU2E7UUFDWDtRQUVBLE1BQU1hLFdBQVcsTUFBTWhDLFVBQVU4QjtRQUNqQyxxREFBcUQ7UUFDckQsTUFBTUcsTUFBTUQsWUFBWW5DLHFEQUFZQSxDQUFDaUIsSUFBSTtRQUN6Q21CLElBQUlqQixPQUFPLENBQUNZLEdBQUcsQ0FBQyxnQkFBZ0IsS0FBSztZQUNuQ00sTUFBTTtZQUNOQyxRQUFRO1lBQ1JDLFFBQVE7WUFDUkMsVUFBVTtRQUNaO1FBQ0EsT0FBT0o7SUFDVDtJQUVBLE9BQU9qQyxVQUFVRTtBQUNuQjtBQUVPLE1BQU1vQyxTQUFTO0lBQ3BCQyxTQUFTO1FBQ1AsOEVBQThFO1FBQzlFO1FBQ0EsNEJBQTRCO1FBQzVCO0tBQ0Q7QUFDSCxFQUFFIiwic291cmNlcyI6WyIvVXNlcnMvdmlkdXNoaXNheGVuYS9Eb2N1bWVudHMvR2l0SHViL3ZhdWx0LW5ldy9hcHBzL2RvY3Mvc3JjL3Byb3h5LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNsZXJrTWlkZGxld2FyZSwgY3JlYXRlUm91dGVNYXRjaGVyIH0gZnJvbSBcIkBjbGVyay9uZXh0anMvc2VydmVyXCI7XG5pbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCI7XG5cbmNvbnN0IGlzUHJvdGVjdGVkUm91dGUgPSBjcmVhdGVSb3V0ZU1hdGNoZXIoW1xuICBcIi9kYXNoYm9hcmQoLiopXCIsXG4gIFwiL2FwaS9kYXNoYm9hcmQoLiopXCIsXG4gIFwiL2FwaS93aXNobGlzdCguKilcIixcbiAgLy8gTm90IC9hcGkvcmF6b3JwYXkvd2ViaG9va3MgLSBSYXpvcnBheSdzIHNlcnZlciBzZW5kcyB0aG9zZSB3aXRoIG5vIENsZXJrXG4gIC8vIHNlc3Npb24gKGF1dGgucHJvdGVjdCgpIHdvdWxkIHNpbGVudGx5IGRyb3AgZXZlcnkgZGVsaXZlcnksIGFzIGhhcHBlbmVkXG4gIC8vIHdpdGggU3RyaXBlIHdlYmhvb2tzIGJlZm9yZSkuIFRoYXQgcm91dGUgYXV0aGVudGljYXRlcyBpdHNlbGYgdmlhIHRoZVxuICAvLyBYLVJhem9ycGF5LVNpZ25hdHVyZSBoZWFkZXIgaW5zdGVhZC5cbiAgXCIvYXBpL3Jhem9ycGF5L2NyZWF0ZS1vcmRlciguKilcIixcbiAgXCIvYXBpL3Jhem9ycGF5L2NyZWF0ZS1zdWJzY3JpcHRpb24oLiopXCIsXG4gIFwiL2FwaS9yYXpvcnBheS92ZXJpZnktcGF5bWVudCguKilcIixcbl0pO1xuXG4vLyBNYXJrZXRpbmcgcGFnZXMgcmVuZGVyIHdpdGggbm8gQ2xlcmtQcm92aWRlciBhbmQgbm8gQ2xlcmsgaG9va3MgKHNlZSB0aGVcbi8vIChtYXJrZXRpbmcpIHJvdXRlIGdyb3VwKSwgc28gdGhlcmUgaXMgbm90aGluZyBvbiB0aGVzZSByb3V0ZXMgZm9yIENsZXJrXG4vLyBtaWRkbGV3YXJlIHRvIHByb3RlY3Qgb3IgaHlkcmF0ZSBhZ2FpbnN0LiBTa2lwcGluZyBjbGVya01pZGRsZXdhcmUgaGVyZVxuLy8gYXZvaWRzIGl0cyBzZXNzaW9uLXZlcmlmaWNhdGlvbiB3b3JrIChhbmQgdGhlIHN0YWxlLVVBVCBoYW5kc2hha2Ugcmlza1xuLy8gYmVsb3cpIG9uIGV2ZXJ5IHZpc2l0IHRvIHRoZSBwYWdlcyB0aGF0IGFjdHVhbGx5IG5lZWQgdG8gYmUgZmFzdC5cbmNvbnN0IGlzTWFya2V0aW5nUm91dGUgPSBjcmVhdGVSb3V0ZU1hdGNoZXIoW1xuICBcIi9cIixcbiAgXCIvZGVtbyguKilcIixcbl0pO1xuXG5jb25zdCB3aXRoQ2xlcmsgPSBjbGVya01pZGRsZXdhcmUoYXN5bmMgKGF1dGgsIHJlcXVlc3QpID0+IHtcbiAgaWYgKGlzUHJvdGVjdGVkUm91dGUocmVxdWVzdCkpIHtcbiAgICBhd2FpdCBhdXRoLnByb3RlY3QoKTtcbiAgfVxufSk7XG5cbi8vIFN0cmlwIHN0YWxlIF9fY2xpZW50X3VhdCBjb29raWVzIGJlZm9yZSBDbGVyayBwcm9jZXNzZXMgdGhlIHJlcXVlc3QuXG4vLyBXaGVuIHRoZSBzaXRlIHJhbiB3aXRoIGRldiBDbGVyayBrZXlzLCBicm93c2VycyByZWNlaXZlZCBhIF9fY2xpZW50X3VhdFxuLy8gY29va2llIGlzc3VlZCBieSB0aGUgZGV2IGluc3RhbmNlLiBBZnRlciBzd2l0Y2hpbmcgdG8gcHJvZHVjdGlvbiBrZXlzLFxuLy8gQ2xlcmsgbWlkZGxld2FyZSBzZWVzIHRoYXQgVUFULCBjYW4ndCBtYXRjaCBpdCB0byB0aGUgcHJvZHVjdGlvbiBpbnN0YW5jZSxcbi8vIGFuZCBpbmplY3RzIGEgY3Jvc3MtaW5zdGFuY2UgaGFuZHNoYWtlIGludG8gdGhlIFJTQyBwYXlsb2FkIC0gcmVkaXJlY3Rpbmdcbi8vIGV2ZW4gbm9uLWF1dGhlbnRpY2F0ZWQgdmlzaXRvcnMgdG8gYWRlcXVhdGUtc2hhZC02MS5jbGVyay5hY2NvdW50cy5kZXYuXG4vLyBSZW1vdmluZyB0aGUgb3JwaGFuZWQgVUFUIGZyb20gdGhlIHJlcXVlc3QgYmVmb3JlIENsZXJrIHJ1bnMgcHJldmVudHMgdGhpcy5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIG1pZGRsZXdhcmUocmVxdWVzdCkge1xuICBjb25zdCBob3N0ID0gcmVxdWVzdC5oZWFkZXJzLmdldChcImhvc3RcIikgfHwgXCJcIjtcbiAgaWYgKGhvc3Quc3RhcnRzV2l0aChcInd3dy5cIikpIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcXVlc3QudXJsKTtcbiAgICB1cmwuaG9zdCA9IGhvc3QucmVwbGFjZSgvXnd3d1xcLi8sIFwiXCIpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QodXJsLnRvU3RyaW5nKCksIDMwMSk7XG4gIH1cblxuICBpZiAoaXNNYXJrZXRpbmdSb3V0ZShyZXF1ZXN0KSkge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UubmV4dCgpO1xuICB9XG5cbiAgY29uc3QgY2xpZW50VWF0ID0gcmVxdWVzdC5jb29raWVzLmdldChcIl9fY2xpZW50X3VhdFwiKT8udmFsdWU7XG4gIGNvbnN0IHNlc3Npb24gPSByZXF1ZXN0LmNvb2tpZXMuZ2V0KFwiX19zZXNzaW9uXCIpPy52YWx1ZTtcblxuICBpZiAoY2xpZW50VWF0ICYmIGNsaWVudFVhdCAhPT0gXCIwXCIgJiYgIXNlc3Npb24pIHtcbiAgICBjb25zdCBuZXdIZWFkZXJzID0gbmV3IEhlYWRlcnMocmVxdWVzdC5oZWFkZXJzKTtcbiAgICBjb25zdCBjbGVhbmVkID0gKG5ld0hlYWRlcnMuZ2V0KFwiY29va2llXCIpIHx8IFwiXCIpXG4gICAgICAuc3BsaXQoXCI7XCIpXG4gICAgICAubWFwKChjKSA9PiBjLnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoKGMpID0+ICFjLnN0YXJ0c1dpdGgoXCJfX2NsaWVudF91YXQ9XCIpKVxuICAgICAgLmpvaW4oXCI7IFwiKTtcbiAgICBjbGVhbmVkXG4gICAgICA/IG5ld0hlYWRlcnMuc2V0KFwiY29va2llXCIsIGNsZWFuZWQpXG4gICAgICA6IG5ld0hlYWRlcnMuZGVsZXRlKFwiY29va2llXCIpO1xuXG4gICAgY29uc3QgY2xlYW5SZXF1ZXN0ID0gbmV3IE5leHRSZXF1ZXN0KHJlcXVlc3QudXJsLCB7XG4gICAgICBtZXRob2Q6IHJlcXVlc3QubWV0aG9kLFxuICAgICAgaGVhZGVyczogbmV3SGVhZGVycyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgd2l0aENsZXJrKGNsZWFuUmVxdWVzdCk7XG4gICAgLy8gQWxzbyB0ZWxsIHRoZSBicm93c2VyIHRvIHplcm8gb3V0IHRoZSBzdGFsZSBjb29raWVcbiAgICBjb25zdCByZXMgPSByZXNwb25zZSA/PyBOZXh0UmVzcG9uc2UubmV4dCgpO1xuICAgIHJlcy5jb29raWVzLnNldChcIl9fY2xpZW50X3VhdFwiLCBcIjBcIiwge1xuICAgICAgcGF0aDogXCIvXCIsXG4gICAgICBtYXhBZ2U6IDAsXG4gICAgICBzZWN1cmU6IHRydWUsXG4gICAgICBzYW1lU2l0ZTogXCJzdHJpY3RcIixcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcmV0dXJuIHdpdGhDbGVyayhyZXF1ZXN0KTtcbn1cblxuZXhwb3J0IGNvbnN0IGNvbmZpZyA9IHtcbiAgbWF0Y2hlcjogW1xuICAgIC8vIFNraXAgYWxsIGludGVybmFsIHBhdGhzIGFuZCBhbGwgc3RhdGljIGZpbGVzLCB1bmxlc3MgZm91bmQgaW4gc2VhcmNoIHBhcmFtc1xuICAgICcvKCg/IV9uZXh0fFteP10qXFxcXC4oPzpodG1sP3xjc3N8anMoPyFvbil8anBlP2d8d2VicHxwbmd8Z2lmfHN2Z3x0dGZ8d29mZjI/fGljb3xjc3Z8ZG9jeD98eGxzeD98emlwfHdlYm1hbmlmZXN0fHhtbHx0eHQpKS4qKScsXG4gICAgLy8gQWx3YXlzIHJ1biBmb3IgQVBJIHJvdXRlc1xuICAgICcvKGFwaXx0cnBjKSguKiknLFxuICBdLFxufTtcbiJdLCJuYW1lcyI6WyJjbGVya01pZGRsZXdhcmUiLCJjcmVhdGVSb3V0ZU1hdGNoZXIiLCJOZXh0UmVxdWVzdCIsIk5leHRSZXNwb25zZSIsImlzUHJvdGVjdGVkUm91dGUiLCJpc01hcmtldGluZ1JvdXRlIiwid2l0aENsZXJrIiwiYXV0aCIsInJlcXVlc3QiLCJwcm90ZWN0IiwibWlkZGxld2FyZSIsImhvc3QiLCJoZWFkZXJzIiwiZ2V0Iiwic3RhcnRzV2l0aCIsInVybCIsIlVSTCIsInJlcGxhY2UiLCJyZWRpcmVjdCIsInRvU3RyaW5nIiwibmV4dCIsImNsaWVudFVhdCIsImNvb2tpZXMiLCJ2YWx1ZSIsInNlc3Npb24iLCJuZXdIZWFkZXJzIiwiSGVhZGVycyIsImNsZWFuZWQiLCJzcGxpdCIsIm1hcCIsImMiLCJ0cmltIiwiZmlsdGVyIiwiam9pbiIsInNldCIsImRlbGV0ZSIsImNsZWFuUmVxdWVzdCIsIm1ldGhvZCIsInJlc3BvbnNlIiwicmVzIiwicGF0aCIsIm1heEFnZSIsInNlY3VyZSIsInNhbWVTaXRlIiwiY29uZmlnIiwibWF0Y2hlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./src/proxy.js\n");

/***/ }),

/***/ "../app-render/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/server/app-render/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "./memory-cache.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/lib/incremental-cache/memory-cache.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/incremental-cache/memory-cache.external.js");

/***/ }),

/***/ "./runtime-reacts.external":
/*!**************************************************************!*\
  !*** external "next/dist/server/runtime-reacts.external.js" ***!
  \**************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/runtime-reacts.external.js");

/***/ }),

/***/ "./shared-cache-controls.external":
/*!*******************************************************************************************!*\
  !*** external "next/dist/server/lib/incremental-cache/shared-cache-controls.external.js" ***!
  \*******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js");

/***/ }),

/***/ "./tags-manifest.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/lib/incremental-cache/tags-manifest.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/incremental-cache/tags-manifest.external.js");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "next/dist/build/adapter/setup-node-env.external":
/*!******************************************************************!*\
  !*** external "next/dist/build/adapter/setup-node-env.external" ***!
  \******************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/build/adapter/setup-node-env.external");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/server/lib/router-utils/instrumentation-globals.external":
/*!*************************************************************************************!*\
  !*** external "next/dist/server/lib/router-utils/instrumentation-globals.external" ***!
  \*************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/router-utils/instrumentation-globals.external");

/***/ }),

/***/ "node:async_hooks":
/*!***********************************!*\
  !*** external "node:async_hooks" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("node:async_hooks");

/***/ }),

/***/ "node:crypto":
/*!******************************!*\
  !*** external "node:crypto" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("node:crypto");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("node:path");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry","vendor-chunks/@swc","vendor-chunks/@clerk"], () => (__webpack_exec__("(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs%2Fsrc%2Fproxy.js&page=%2Fproxy&rootDir=%2FUsers%2Fvidushisaxena%2FDocuments%2FGitHub%2Fvault-new%2Fapps%2Fdocs&matchers=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();