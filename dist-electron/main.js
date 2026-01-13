var Bi = Object.defineProperty;
var Ni = (a, e, n) => e in a ? Bi(a, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : a[e] = n;
var he = (a, e, n) => Ni(a, typeof e != "symbol" ? e + "" : e, n);
import { app as me, BrowserWindow as At, protocol as zi, net as Ii, nativeImage as $i, ipcMain as C, shell as jt } from "electron";
import { fileURLToPath as Di, pathToFileURL as Mi } from "node:url";
import J from "node:path";
import se, { createWriteStream as Hi } from "node:fs";
import Se from "util";
import W, { Readable as Gi } from "stream";
import Tt from "path";
import cn from "http";
import pn from "https";
import ma from "url";
import Wi from "fs";
import Ot from "crypto";
import Pt from "http2";
import Vi from "assert";
import Ft from "tty";
import Ji from "os";
import ue from "zlib";
import { EventEmitter as Ki } from "events";
import { pipeline as Xi } from "node:stream/promises";
import { Readable as Yi } from "node:stream";
function Ut(a, e) {
  return function() {
    return a.apply(e, arguments);
  };
}
const { toString: Zi } = Object.prototype, { getPrototypeOf: ln } = Object, { iterator: fa, toStringTag: qt } = Symbol, xa = /* @__PURE__ */ ((a) => (e) => {
  const n = Zi.call(e);
  return a[n] || (a[n] = n.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null)), ae = (a) => (a = a.toLowerCase(), (e) => xa(e) === a), ha = (a) => (e) => typeof e === a, { isArray: Ue } = Array, Oe = ha("undefined");
function $e(a) {
  return a !== null && !Oe(a) && a.constructor !== null && !Oe(a.constructor) && V(a.constructor.isBuffer) && a.constructor.isBuffer(a);
}
const Lt = ae("ArrayBuffer");
function Qi(a) {
  let e;
  return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? e = ArrayBuffer.isView(a) : e = a && a.buffer && Lt(a.buffer), e;
}
const es = ha("string"), V = ha("function"), Bt = ha("number"), De = (a) => a !== null && typeof a == "object", as = (a) => a === !0 || a === !1, na = (a) => {
  if (xa(a) !== "object")
    return !1;
  const e = ln(a);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(qt in a) && !(fa in a);
}, ns = (a) => {
  if (!De(a) || $e(a))
    return !1;
  try {
    return Object.keys(a).length === 0 && Object.getPrototypeOf(a) === Object.prototype;
  } catch {
    return !1;
  }
}, ts = ae("Date"), is = ae("File"), ss = ae("Blob"), os = ae("FileList"), rs = (a) => De(a) && V(a.pipe), cs = (a) => {
  let e;
  return a && (typeof FormData == "function" && a instanceof FormData || V(a.append) && ((e = xa(a)) === "formdata" || // detect form-data instance
  e === "object" && V(a.toString) && a.toString() === "[object FormData]"));
}, ps = ae("URLSearchParams"), [ls, us, ds, ms] = ["ReadableStream", "Request", "Response", "Headers"].map(ae), fs = (a) => a.trim ? a.trim() : a.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function Me(a, e, { allOwnKeys: n = !1 } = {}) {
  if (a === null || typeof a > "u")
    return;
  let t, i;
  if (typeof a != "object" && (a = [a]), Ue(a))
    for (t = 0, i = a.length; t < i; t++)
      e.call(null, a[t], t, a);
  else {
    if ($e(a))
      return;
    const s = n ? Object.getOwnPropertyNames(a) : Object.keys(a), o = s.length;
    let r;
    for (t = 0; t < o; t++)
      r = s[t], e.call(null, a[r], r, a);
  }
}
function Nt(a, e) {
  if ($e(a))
    return null;
  e = e.toLowerCase();
  const n = Object.keys(a);
  let t = n.length, i;
  for (; t-- > 0; )
    if (i = n[t], e === i.toLowerCase())
      return i;
  return null;
}
const ve = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, zt = (a) => !Oe(a) && a !== ve;
function Za() {
  const { caseless: a, skipUndefined: e } = zt(this) && this || {}, n = {}, t = (i, s) => {
    const o = a && Nt(n, s) || s;
    na(n[o]) && na(i) ? n[o] = Za(n[o], i) : na(i) ? n[o] = Za({}, i) : Ue(i) ? n[o] = i.slice() : (!e || !Oe(i)) && (n[o] = i);
  };
  for (let i = 0, s = arguments.length; i < s; i++)
    arguments[i] && Me(arguments[i], t);
  return n;
}
const xs = (a, e, n, { allOwnKeys: t } = {}) => (Me(e, (i, s) => {
  n && V(i) ? a[s] = Ut(i, n) : a[s] = i;
}, { allOwnKeys: t }), a), hs = (a) => (a.charCodeAt(0) === 65279 && (a = a.slice(1)), a), vs = (a, e, n, t) => {
  a.prototype = Object.create(e.prototype, t), a.prototype.constructor = a, Object.defineProperty(a, "super", {
    value: e.prototype
  }), n && Object.assign(a.prototype, n);
}, bs = (a, e, n, t) => {
  let i, s, o;
  const r = {};
  if (e = e || {}, a == null) return e;
  do {
    for (i = Object.getOwnPropertyNames(a), s = i.length; s-- > 0; )
      o = i[s], (!t || t(o, a, e)) && !r[o] && (e[o] = a[o], r[o] = !0);
    a = n !== !1 && ln(a);
  } while (a && (!n || n(a, e)) && a !== Object.prototype);
  return e;
}, gs = (a, e, n) => {
  a = String(a), (n === void 0 || n > a.length) && (n = a.length), n -= e.length;
  const t = a.indexOf(e, n);
  return t !== -1 && t === n;
}, ys = (a) => {
  if (!a) return null;
  if (Ue(a)) return a;
  let e = a.length;
  if (!Bt(e)) return null;
  const n = new Array(e);
  for (; e-- > 0; )
    n[e] = a[e];
  return n;
}, ws = /* @__PURE__ */ ((a) => (e) => a && e instanceof a)(typeof Uint8Array < "u" && ln(Uint8Array)), _s = (a, e) => {
  const t = (a && a[fa]).call(a);
  let i;
  for (; (i = t.next()) && !i.done; ) {
    const s = i.value;
    e.call(a, s[0], s[1]);
  }
}, ks = (a, e) => {
  let n;
  const t = [];
  for (; (n = a.exec(e)) !== null; )
    t.push(n);
  return t;
}, Ss = ae("HTMLFormElement"), Cs = (a) => a.toLowerCase().replace(
  /[-_\s]([a-z\d])(\w*)/g,
  function(n, t, i) {
    return t.toUpperCase() + i;
  }
), Pn = (({ hasOwnProperty: a }) => (e, n) => a.call(e, n))(Object.prototype), Es = ae("RegExp"), It = (a, e) => {
  const n = Object.getOwnPropertyDescriptors(a), t = {};
  Me(n, (i, s) => {
    let o;
    (o = e(i, s, a)) !== !1 && (t[s] = o || i);
  }), Object.defineProperties(a, t);
}, Rs = (a) => {
  It(a, (e, n) => {
    if (V(a) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
      return !1;
    const t = a[n];
    if (V(t)) {
      if (e.enumerable = !1, "writable" in e) {
        e.writable = !1;
        return;
      }
      e.set || (e.set = () => {
        throw Error("Can not rewrite read-only method '" + n + "'");
      });
    }
  });
}, As = (a, e) => {
  const n = {}, t = (i) => {
    i.forEach((s) => {
      n[s] = !0;
    });
  };
  return Ue(a) ? t(a) : t(String(a).split(e)), n;
}, js = () => {
}, Ts = (a, e) => a != null && Number.isFinite(a = +a) ? a : e;
function Os(a) {
  return !!(a && V(a.append) && a[qt] === "FormData" && a[fa]);
}
const Ps = (a) => {
  const e = new Array(10), n = (t, i) => {
    if (De(t)) {
      if (e.indexOf(t) >= 0)
        return;
      if ($e(t))
        return t;
      if (!("toJSON" in t)) {
        e[i] = t;
        const s = Ue(t) ? [] : {};
        return Me(t, (o, r) => {
          const p = n(o, i + 1);
          !Oe(p) && (s[r] = p);
        }), e[i] = void 0, s;
      }
    }
    return t;
  };
  return n(a, 0);
}, Fs = ae("AsyncFunction"), Us = (a) => a && (De(a) || V(a)) && V(a.then) && V(a.catch), $t = ((a, e) => a ? setImmediate : e ? ((n, t) => (ve.addEventListener("message", ({ source: i, data: s }) => {
  i === ve && s === n && t.length && t.shift()();
}, !1), (i) => {
  t.push(i), ve.postMessage(n, "*");
}))(`axios@${Math.random()}`, []) : (n) => setTimeout(n))(
  typeof setImmediate == "function",
  V(ve.postMessage)
), qs = typeof queueMicrotask < "u" ? queueMicrotask.bind(ve) : typeof process < "u" && process.nextTick || $t, Ls = (a) => a != null && V(a[fa]), m = {
  isArray: Ue,
  isArrayBuffer: Lt,
  isBuffer: $e,
  isFormData: cs,
  isArrayBufferView: Qi,
  isString: es,
  isNumber: Bt,
  isBoolean: as,
  isObject: De,
  isPlainObject: na,
  isEmptyObject: ns,
  isReadableStream: ls,
  isRequest: us,
  isResponse: ds,
  isHeaders: ms,
  isUndefined: Oe,
  isDate: ts,
  isFile: is,
  isBlob: ss,
  isRegExp: Es,
  isFunction: V,
  isStream: rs,
  isURLSearchParams: ps,
  isTypedArray: ws,
  isFileList: os,
  forEach: Me,
  merge: Za,
  extend: xs,
  trim: fs,
  stripBOM: hs,
  inherits: vs,
  toFlatObject: bs,
  kindOf: xa,
  kindOfTest: ae,
  endsWith: gs,
  toArray: ys,
  forEachEntry: _s,
  matchAll: ks,
  isHTMLForm: Ss,
  hasOwnProperty: Pn,
  hasOwnProp: Pn,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors: It,
  freezeMethods: Rs,
  toObjectSet: As,
  toCamelCase: Cs,
  noop: js,
  toFiniteNumber: Ts,
  findKey: Nt,
  global: ve,
  isContextDefined: zt,
  isSpecCompliantForm: Os,
  toJSONObject: Ps,
  isAsyncFn: Fs,
  isThenable: Us,
  setImmediate: $t,
  asap: qs,
  isIterable: Ls
};
function g(a, e, n, t, i) {
  Error.call(this), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack, this.message = a, this.name = "AxiosError", e && (this.code = e), n && (this.config = n), t && (this.request = t), i && (this.response = i, this.status = i.status ? i.status : null);
}
m.inherits(g, Error, {
  toJSON: function() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: m.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
const Dt = g.prototype, Mt = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
  // eslint-disable-next-line func-names
].forEach((a) => {
  Mt[a] = { value: a };
});
Object.defineProperties(g, Mt);
Object.defineProperty(Dt, "isAxiosError", { value: !0 });
g.from = (a, e, n, t, i, s) => {
  const o = Object.create(Dt);
  m.toFlatObject(a, o, function(c) {
    return c !== Error.prototype;
  }, (d) => d !== "isAxiosError");
  const r = a && a.message ? a.message : "Error", p = e == null && a ? a.code : e;
  return g.call(o, r, p, n, t, i), a && o.cause == null && Object.defineProperty(o, "cause", { value: a, configurable: !0 }), o.name = a && a.name || "Error", s && Object.assign(o, s), o;
};
function Ht(a) {
  return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
}
var Gt = W.Stream, Bs = Se, Ns = ne;
function ne() {
  this.source = null, this.dataSize = 0, this.maxDataSize = 1024 * 1024, this.pauseStream = !0, this._maxDataSizeExceeded = !1, this._released = !1, this._bufferedEvents = [];
}
Bs.inherits(ne, Gt);
ne.create = function(a, e) {
  var n = new this();
  e = e || {};
  for (var t in e)
    n[t] = e[t];
  n.source = a;
  var i = a.emit;
  return a.emit = function() {
    return n._handleEmit(arguments), i.apply(a, arguments);
  }, a.on("error", function() {
  }), n.pauseStream && a.pause(), n;
};
Object.defineProperty(ne.prototype, "readable", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    return this.source.readable;
  }
});
ne.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};
ne.prototype.resume = function() {
  this._released || this.release(), this.source.resume();
};
ne.prototype.pause = function() {
  this.source.pause();
};
ne.prototype.release = function() {
  this._released = !0, this._bufferedEvents.forEach((function(a) {
    this.emit.apply(this, a);
  }).bind(this)), this._bufferedEvents = [];
};
ne.prototype.pipe = function() {
  var a = Gt.prototype.pipe.apply(this, arguments);
  return this.resume(), a;
};
ne.prototype._handleEmit = function(a) {
  if (this._released) {
    this.emit.apply(this, a);
    return;
  }
  a[0] === "data" && (this.dataSize += a[1].length, this._checkIfMaxDataSizeExceeded()), this._bufferedEvents.push(a);
};
ne.prototype._checkIfMaxDataSizeExceeded = function() {
  if (!this._maxDataSizeExceeded && !(this.dataSize <= this.maxDataSize)) {
    this._maxDataSizeExceeded = !0;
    var a = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(a));
  }
};
var zs = Se, Wt = W.Stream, Fn = Ns, Is = U;
function U() {
  this.writable = !1, this.readable = !0, this.dataSize = 0, this.maxDataSize = 2 * 1024 * 1024, this.pauseStreams = !0, this._released = !1, this._streams = [], this._currentStream = null, this._insideLoop = !1, this._pendingNext = !1;
}
zs.inherits(U, Wt);
U.create = function(a) {
  var e = new this();
  a = a || {};
  for (var n in a)
    e[n] = a[n];
  return e;
};
U.isStreamLike = function(a) {
  return typeof a != "function" && typeof a != "string" && typeof a != "boolean" && typeof a != "number" && !Buffer.isBuffer(a);
};
U.prototype.append = function(a) {
  var e = U.isStreamLike(a);
  if (e) {
    if (!(a instanceof Fn)) {
      var n = Fn.create(a, {
        maxDataSize: 1 / 0,
        pauseStream: this.pauseStreams
      });
      a.on("data", this._checkDataSize.bind(this)), a = n;
    }
    this._handleErrors(a), this.pauseStreams && a.pause();
  }
  return this._streams.push(a), this;
};
U.prototype.pipe = function(a, e) {
  return Wt.prototype.pipe.call(this, a, e), this.resume(), a;
};
U.prototype._getNext = function() {
  if (this._currentStream = null, this._insideLoop) {
    this._pendingNext = !0;
    return;
  }
  this._insideLoop = !0;
  try {
    do
      this._pendingNext = !1, this._realGetNext();
    while (this._pendingNext);
  } finally {
    this._insideLoop = !1;
  }
};
U.prototype._realGetNext = function() {
  var a = this._streams.shift();
  if (typeof a > "u") {
    this.end();
    return;
  }
  if (typeof a != "function") {
    this._pipeNext(a);
    return;
  }
  var e = a;
  e((function(n) {
    var t = U.isStreamLike(n);
    t && (n.on("data", this._checkDataSize.bind(this)), this._handleErrors(n)), this._pipeNext(n);
  }).bind(this));
};
U.prototype._pipeNext = function(a) {
  this._currentStream = a;
  var e = U.isStreamLike(a);
  if (e) {
    a.on("end", this._getNext.bind(this)), a.pipe(this, { end: !1 });
    return;
  }
  var n = a;
  this.write(n), this._getNext();
};
U.prototype._handleErrors = function(a) {
  var e = this;
  a.on("error", function(n) {
    e._emitError(n);
  });
};
U.prototype.write = function(a) {
  this.emit("data", a);
};
U.prototype.pause = function() {
  this.pauseStreams && (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function" && this._currentStream.pause(), this.emit("pause"));
};
U.prototype.resume = function() {
  this._released || (this._released = !0, this.writable = !0, this._getNext()), this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function" && this._currentStream.resume(), this.emit("resume");
};
U.prototype.end = function() {
  this._reset(), this.emit("end");
};
U.prototype.destroy = function() {
  this._reset(), this.emit("close");
};
U.prototype._reset = function() {
  this.writable = !1, this._streams = [], this._currentStream = null;
};
U.prototype._checkDataSize = function() {
  if (this._updateDataSize(), !(this.dataSize <= this.maxDataSize)) {
    var a = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(a));
  }
};
U.prototype._updateDataSize = function() {
  this.dataSize = 0;
  var a = this;
  this._streams.forEach(function(e) {
    e.dataSize && (a.dataSize += e.dataSize);
  }), this._currentStream && this._currentStream.dataSize && (this.dataSize += this._currentStream.dataSize);
};
U.prototype._emitError = function(a) {
  this._reset(), this.emit("error", a);
};
var Vt = {};
const $s = {
  "application/1d-interleaved-parityfec": {
    source: "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/3gpp-ims+xml": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphal+json": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphalforms+json": {
    source: "iana",
    compressible: !0
  },
  "application/a2l": {
    source: "iana"
  },
  "application/ace+cbor": {
    source: "iana"
  },
  "application/activemessage": {
    source: "iana"
  },
  "application/activity+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-directory+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcost+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcostparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointprop+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointpropparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-error+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamcontrol+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/aml": {
    source: "iana"
  },
  "application/andrew-inset": {
    source: "iana",
    extensions: [
      "ez"
    ]
  },
  "application/applefile": {
    source: "iana"
  },
  "application/applixware": {
    source: "apache",
    extensions: [
      "aw"
    ]
  },
  "application/at+jwt": {
    source: "iana"
  },
  "application/atf": {
    source: "iana"
  },
  "application/atfx": {
    source: "iana"
  },
  "application/atom+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atom"
    ]
  },
  "application/atomcat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomcat"
    ]
  },
  "application/atomdeleted+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomdeleted"
    ]
  },
  "application/atomicmail": {
    source: "iana"
  },
  "application/atomsvc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomsvc"
    ]
  },
  "application/atsc-dwd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dwd"
    ]
  },
  "application/atsc-dynamic-event-message": {
    source: "iana"
  },
  "application/atsc-held+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "held"
    ]
  },
  "application/atsc-rdt+json": {
    source: "iana",
    compressible: !0
  },
  "application/atsc-rsat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsat"
    ]
  },
  "application/atxml": {
    source: "iana"
  },
  "application/auth-policy+xml": {
    source: "iana",
    compressible: !0
  },
  "application/bacnet-xdd+zip": {
    source: "iana",
    compressible: !1
  },
  "application/batch-smtp": {
    source: "iana"
  },
  "application/bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/beep+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/calendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/calendar+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xcs"
    ]
  },
  "application/call-completion": {
    source: "iana"
  },
  "application/cals-1840": {
    source: "iana"
  },
  "application/captive+json": {
    source: "iana",
    compressible: !0
  },
  "application/cbor": {
    source: "iana"
  },
  "application/cbor-seq": {
    source: "iana"
  },
  "application/cccex": {
    source: "iana"
  },
  "application/ccmp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ccxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ccxml"
    ]
  },
  "application/cdfx+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdfx"
    ]
  },
  "application/cdmi-capability": {
    source: "iana",
    extensions: [
      "cdmia"
    ]
  },
  "application/cdmi-container": {
    source: "iana",
    extensions: [
      "cdmic"
    ]
  },
  "application/cdmi-domain": {
    source: "iana",
    extensions: [
      "cdmid"
    ]
  },
  "application/cdmi-object": {
    source: "iana",
    extensions: [
      "cdmio"
    ]
  },
  "application/cdmi-queue": {
    source: "iana",
    extensions: [
      "cdmiq"
    ]
  },
  "application/cdni": {
    source: "iana"
  },
  "application/cea": {
    source: "iana"
  },
  "application/cea-2018+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cellml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cfw": {
    source: "iana"
  },
  "application/city+json": {
    source: "iana",
    compressible: !0
  },
  "application/clr": {
    source: "iana"
  },
  "application/clue+xml": {
    source: "iana",
    compressible: !0
  },
  "application/clue_info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cms": {
    source: "iana"
  },
  "application/cnrp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/coap-group+json": {
    source: "iana",
    compressible: !0
  },
  "application/coap-payload": {
    source: "iana"
  },
  "application/commonground": {
    source: "iana"
  },
  "application/conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cose": {
    source: "iana"
  },
  "application/cose-key": {
    source: "iana"
  },
  "application/cose-key-set": {
    source: "iana"
  },
  "application/cpl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cpl"
    ]
  },
  "application/csrattrs": {
    source: "iana"
  },
  "application/csta+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cstadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/csvm+json": {
    source: "iana",
    compressible: !0
  },
  "application/cu-seeme": {
    source: "apache",
    extensions: [
      "cu"
    ]
  },
  "application/cwt": {
    source: "iana"
  },
  "application/cybercash": {
    source: "iana"
  },
  "application/dart": {
    compressible: !0
  },
  "application/dash+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpd"
    ]
  },
  "application/dash-patch+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpp"
    ]
  },
  "application/dashdelta": {
    source: "iana"
  },
  "application/davmount+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "davmount"
    ]
  },
  "application/dca-rft": {
    source: "iana"
  },
  "application/dcd": {
    source: "iana"
  },
  "application/dec-dx": {
    source: "iana"
  },
  "application/dialog-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dicom": {
    source: "iana"
  },
  "application/dicom+json": {
    source: "iana",
    compressible: !0
  },
  "application/dicom+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dii": {
    source: "iana"
  },
  "application/dit": {
    source: "iana"
  },
  "application/dns": {
    source: "iana"
  },
  "application/dns+json": {
    source: "iana",
    compressible: !0
  },
  "application/dns-message": {
    source: "iana"
  },
  "application/docbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dbk"
    ]
  },
  "application/dots+cbor": {
    source: "iana"
  },
  "application/dskpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dssc+der": {
    source: "iana",
    extensions: [
      "dssc"
    ]
  },
  "application/dssc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdssc"
    ]
  },
  "application/dvcs": {
    source: "iana"
  },
  "application/ecmascript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es",
      "ecma"
    ]
  },
  "application/edi-consent": {
    source: "iana"
  },
  "application/edi-x12": {
    source: "iana",
    compressible: !1
  },
  "application/edifact": {
    source: "iana",
    compressible: !1
  },
  "application/efi": {
    source: "iana"
  },
  "application/elm+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/elm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.cap+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/emergencycalldata.comment+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.deviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.ecall.msd": {
    source: "iana"
  },
  "application/emergencycalldata.providerinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.serviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.subscriberinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.veds+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emma+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emma"
    ]
  },
  "application/emotionml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emotionml"
    ]
  },
  "application/encaprtp": {
    source: "iana"
  },
  "application/epp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/epub+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "epub"
    ]
  },
  "application/eshop": {
    source: "iana"
  },
  "application/exi": {
    source: "iana",
    extensions: [
      "exi"
    ]
  },
  "application/expect-ct-report+json": {
    source: "iana",
    compressible: !0
  },
  "application/express": {
    source: "iana",
    extensions: [
      "exp"
    ]
  },
  "application/fastinfoset": {
    source: "iana"
  },
  "application/fastsoap": {
    source: "iana"
  },
  "application/fdt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fdt"
    ]
  },
  "application/fhir+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fhir+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fido.trusted-apps+json": {
    compressible: !0
  },
  "application/fits": {
    source: "iana"
  },
  "application/flexfec": {
    source: "iana"
  },
  "application/font-sfnt": {
    source: "iana"
  },
  "application/font-tdpfr": {
    source: "iana",
    extensions: [
      "pfr"
    ]
  },
  "application/font-woff": {
    source: "iana",
    compressible: !1
  },
  "application/framework-attributes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/geo+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "geojson"
    ]
  },
  "application/geo+json-seq": {
    source: "iana"
  },
  "application/geopackage+sqlite3": {
    source: "iana"
  },
  "application/geoxacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/gltf-buffer": {
    source: "iana"
  },
  "application/gml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gml"
    ]
  },
  "application/gpx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "gpx"
    ]
  },
  "application/gxf": {
    source: "apache",
    extensions: [
      "gxf"
    ]
  },
  "application/gzip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gz"
    ]
  },
  "application/h224": {
    source: "iana"
  },
  "application/held+xml": {
    source: "iana",
    compressible: !0
  },
  "application/hjson": {
    extensions: [
      "hjson"
    ]
  },
  "application/http": {
    source: "iana"
  },
  "application/hyperstudio": {
    source: "iana",
    extensions: [
      "stk"
    ]
  },
  "application/ibe-key-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pkg-reply+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pp-data": {
    source: "iana"
  },
  "application/iges": {
    source: "iana"
  },
  "application/im-iscomposing+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/index": {
    source: "iana"
  },
  "application/index.cmd": {
    source: "iana"
  },
  "application/index.obj": {
    source: "iana"
  },
  "application/index.response": {
    source: "iana"
  },
  "application/index.vnd": {
    source: "iana"
  },
  "application/inkml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ink",
      "inkml"
    ]
  },
  "application/iotp": {
    source: "iana"
  },
  "application/ipfix": {
    source: "iana",
    extensions: [
      "ipfix"
    ]
  },
  "application/ipp": {
    source: "iana"
  },
  "application/isup": {
    source: "iana"
  },
  "application/its+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "its"
    ]
  },
  "application/java-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    source: "apache",
    compressible: !1,
    extensions: [
      "ser"
    ]
  },
  "application/java-vm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "class"
    ]
  },
  "application/javascript": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "js",
      "mjs"
    ]
  },
  "application/jf2feed+json": {
    source: "iana",
    compressible: !0
  },
  "application/jose": {
    source: "iana"
  },
  "application/jose+json": {
    source: "iana",
    compressible: !0
  },
  "application/jrd+json": {
    source: "iana",
    compressible: !0
  },
  "application/jscalendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "json",
      "map"
    ]
  },
  "application/json-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/json-seq": {
    source: "iana"
  },
  "application/json5": {
    extensions: [
      "json5"
    ]
  },
  "application/jsonml+json": {
    source: "apache",
    compressible: !0,
    extensions: [
      "jsonml"
    ]
  },
  "application/jwk+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwk-set+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwt": {
    source: "iana"
  },
  "application/kpml-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/kpml-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ld+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "jsonld"
    ]
  },
  "application/lgr+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lgr"
    ]
  },
  "application/link-format": {
    source: "iana"
  },
  "application/load-control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lost+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lostxml"
    ]
  },
  "application/lostsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lpf+zip": {
    source: "iana",
    compressible: !1
  },
  "application/lxf": {
    source: "iana"
  },
  "application/mac-binhex40": {
    source: "iana",
    extensions: [
      "hqx"
    ]
  },
  "application/mac-compactpro": {
    source: "apache",
    extensions: [
      "cpt"
    ]
  },
  "application/macwriteii": {
    source: "iana"
  },
  "application/mads+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mads"
    ]
  },
  "application/manifest+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "webmanifest"
    ]
  },
  "application/marc": {
    source: "iana",
    extensions: [
      "mrc"
    ]
  },
  "application/marcxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mrcx"
    ]
  },
  "application/mathematica": {
    source: "iana",
    extensions: [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mathml"
    ]
  },
  "application/mathml-content+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mathml-presentation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-associated-procedure-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-deregister+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-envelope+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-protection-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-reception-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-schedule+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-user-service-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbox": {
    source: "iana",
    extensions: [
      "mbox"
    ]
  },
  "application/media-policy-dataset+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpf"
    ]
  },
  "application/media_control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mediaservercontrol+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mscml"
    ]
  },
  "application/merge-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/metalink+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "metalink"
    ]
  },
  "application/metalink4+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "meta4"
    ]
  },
  "application/mets+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mets"
    ]
  },
  "application/mf4": {
    source: "iana"
  },
  "application/mikey": {
    source: "iana"
  },
  "application/mipc": {
    source: "iana"
  },
  "application/missing-blocks+cbor-seq": {
    source: "iana"
  },
  "application/mmt-aei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "maei"
    ]
  },
  "application/mmt-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musd"
    ]
  },
  "application/mods+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mods"
    ]
  },
  "application/moss-keys": {
    source: "iana"
  },
  "application/moss-signature": {
    source: "iana"
  },
  "application/mosskey-data": {
    source: "iana"
  },
  "application/mosskey-request": {
    source: "iana"
  },
  "application/mp21": {
    source: "iana",
    extensions: [
      "m21",
      "mp21"
    ]
  },
  "application/mp4": {
    source: "iana",
    extensions: [
      "mp4s",
      "m4p"
    ]
  },
  "application/mpeg4-generic": {
    source: "iana"
  },
  "application/mpeg4-iod": {
    source: "iana"
  },
  "application/mpeg4-iod-xmt": {
    source: "iana"
  },
  "application/mrb-consumer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mrb-publish+xml": {
    source: "iana",
    compressible: !0
  },
  "application/msc-ivr+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msc-mixer+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msword": {
    source: "iana",
    compressible: !1,
    extensions: [
      "doc",
      "dot"
    ]
  },
  "application/mud+json": {
    source: "iana",
    compressible: !0
  },
  "application/multipart-core": {
    source: "iana"
  },
  "application/mxf": {
    source: "iana",
    extensions: [
      "mxf"
    ]
  },
  "application/n-quads": {
    source: "iana",
    extensions: [
      "nq"
    ]
  },
  "application/n-triples": {
    source: "iana",
    extensions: [
      "nt"
    ]
  },
  "application/nasdata": {
    source: "iana"
  },
  "application/news-checkgroups": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-groupinfo": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-transmission": {
    source: "iana"
  },
  "application/nlsml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/node": {
    source: "iana",
    extensions: [
      "cjs"
    ]
  },
  "application/nss": {
    source: "iana"
  },
  "application/oauth-authz-req+jwt": {
    source: "iana"
  },
  "application/oblivious-dns-message": {
    source: "iana"
  },
  "application/ocsp-request": {
    source: "iana"
  },
  "application/ocsp-response": {
    source: "iana"
  },
  "application/octet-stream": {
    source: "iana",
    compressible: !1,
    extensions: [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    source: "iana",
    extensions: [
      "oda"
    ]
  },
  "application/odm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/odx": {
    source: "iana"
  },
  "application/oebps-package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "opf"
    ]
  },
  "application/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogx"
    ]
  },
  "application/omdoc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "omdoc"
    ]
  },
  "application/onenote": {
    source: "apache",
    extensions: [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/opc-nodeset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/oscore": {
    source: "iana"
  },
  "application/oxps": {
    source: "iana",
    extensions: [
      "oxps"
    ]
  },
  "application/p21": {
    source: "iana"
  },
  "application/p21+zip": {
    source: "iana",
    compressible: !1
  },
  "application/p2p-overlay+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "relo"
    ]
  },
  "application/parityfec": {
    source: "iana"
  },
  "application/passport": {
    source: "iana"
  },
  "application/patch-ops-error+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xer"
    ]
  },
  "application/pdf": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pdf"
    ]
  },
  "application/pdx": {
    source: "iana"
  },
  "application/pem-certificate-chain": {
    source: "iana"
  },
  "application/pgp-encrypted": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pgp"
    ]
  },
  "application/pgp-keys": {
    source: "iana",
    extensions: [
      "asc"
    ]
  },
  "application/pgp-signature": {
    source: "iana",
    extensions: [
      "asc",
      "sig"
    ]
  },
  "application/pics-rules": {
    source: "apache",
    extensions: [
      "prf"
    ]
  },
  "application/pidf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pidf-diff+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pkcs10": {
    source: "iana",
    extensions: [
      "p10"
    ]
  },
  "application/pkcs12": {
    source: "iana"
  },
  "application/pkcs7-mime": {
    source: "iana",
    extensions: [
      "p7m",
      "p7c"
    ]
  },
  "application/pkcs7-signature": {
    source: "iana",
    extensions: [
      "p7s"
    ]
  },
  "application/pkcs8": {
    source: "iana",
    extensions: [
      "p8"
    ]
  },
  "application/pkcs8-encrypted": {
    source: "iana"
  },
  "application/pkix-attr-cert": {
    source: "iana",
    extensions: [
      "ac"
    ]
  },
  "application/pkix-cert": {
    source: "iana",
    extensions: [
      "cer"
    ]
  },
  "application/pkix-crl": {
    source: "iana",
    extensions: [
      "crl"
    ]
  },
  "application/pkix-pkipath": {
    source: "iana",
    extensions: [
      "pkipath"
    ]
  },
  "application/pkixcmp": {
    source: "iana",
    extensions: [
      "pki"
    ]
  },
  "application/pls+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pls"
    ]
  },
  "application/poc-settings+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/postscript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/ppsp-tracker+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/provenance+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "provx"
    ]
  },
  "application/prs.alvestrand.titrax-sheet": {
    source: "iana"
  },
  "application/prs.cww": {
    source: "iana",
    extensions: [
      "cww"
    ]
  },
  "application/prs.cyn": {
    source: "iana",
    charset: "7-BIT"
  },
  "application/prs.hpub+zip": {
    source: "iana",
    compressible: !1
  },
  "application/prs.nprend": {
    source: "iana"
  },
  "application/prs.plucker": {
    source: "iana"
  },
  "application/prs.rdf-xml-crypt": {
    source: "iana"
  },
  "application/prs.xsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/pskc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pskcxml"
    ]
  },
  "application/pvd+json": {
    source: "iana",
    compressible: !0
  },
  "application/qsig": {
    source: "iana"
  },
  "application/raml+yaml": {
    compressible: !0,
    extensions: [
      "raml"
    ]
  },
  "application/raptorfec": {
    source: "iana"
  },
  "application/rdap+json": {
    source: "iana",
    compressible: !0
  },
  "application/rdf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rdf",
      "owl"
    ]
  },
  "application/reginfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rif"
    ]
  },
  "application/relax-ng-compact-syntax": {
    source: "iana",
    extensions: [
      "rnc"
    ]
  },
  "application/remote-printing": {
    source: "iana"
  },
  "application/reputon+json": {
    source: "iana",
    compressible: !0
  },
  "application/resource-lists+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rl"
    ]
  },
  "application/resource-lists-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rld"
    ]
  },
  "application/rfc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/riscos": {
    source: "iana"
  },
  "application/rlmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/rls-services+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rs"
    ]
  },
  "application/route-apd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rapd"
    ]
  },
  "application/route-s-tsid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sls"
    ]
  },
  "application/route-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rusd"
    ]
  },
  "application/rpki-ghostbusters": {
    source: "iana",
    extensions: [
      "gbr"
    ]
  },
  "application/rpki-manifest": {
    source: "iana",
    extensions: [
      "mft"
    ]
  },
  "application/rpki-publication": {
    source: "iana"
  },
  "application/rpki-roa": {
    source: "iana",
    extensions: [
      "roa"
    ]
  },
  "application/rpki-updown": {
    source: "iana"
  },
  "application/rsd+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rsd"
    ]
  },
  "application/rss+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rss"
    ]
  },
  "application/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "application/rtploopback": {
    source: "iana"
  },
  "application/rtx": {
    source: "iana"
  },
  "application/samlassertion+xml": {
    source: "iana",
    compressible: !0
  },
  "application/samlmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sarif+json": {
    source: "iana",
    compressible: !0
  },
  "application/sarif-external-properties+json": {
    source: "iana",
    compressible: !0
  },
  "application/sbe": {
    source: "iana"
  },
  "application/sbml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sbml"
    ]
  },
  "application/scaip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/scim+json": {
    source: "iana",
    compressible: !0
  },
  "application/scvp-cv-request": {
    source: "iana",
    extensions: [
      "scq"
    ]
  },
  "application/scvp-cv-response": {
    source: "iana",
    extensions: [
      "scs"
    ]
  },
  "application/scvp-vp-request": {
    source: "iana",
    extensions: [
      "spq"
    ]
  },
  "application/scvp-vp-response": {
    source: "iana",
    extensions: [
      "spp"
    ]
  },
  "application/sdp": {
    source: "iana",
    extensions: [
      "sdp"
    ]
  },
  "application/secevent+jwt": {
    source: "iana"
  },
  "application/senml+cbor": {
    source: "iana"
  },
  "application/senml+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "senmlx"
    ]
  },
  "application/senml-etch+cbor": {
    source: "iana"
  },
  "application/senml-etch+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml-exi": {
    source: "iana"
  },
  "application/sensml+cbor": {
    source: "iana"
  },
  "application/sensml+json": {
    source: "iana",
    compressible: !0
  },
  "application/sensml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sensmlx"
    ]
  },
  "application/sensml-exi": {
    source: "iana"
  },
  "application/sep+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sep-exi": {
    source: "iana"
  },
  "application/session-info": {
    source: "iana"
  },
  "application/set-payment": {
    source: "iana"
  },
  "application/set-payment-initiation": {
    source: "iana",
    extensions: [
      "setpay"
    ]
  },
  "application/set-registration": {
    source: "iana"
  },
  "application/set-registration-initiation": {
    source: "iana",
    extensions: [
      "setreg"
    ]
  },
  "application/sgml": {
    source: "iana"
  },
  "application/sgml-open-catalog": {
    source: "iana"
  },
  "application/shf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "shf"
    ]
  },
  "application/sieve": {
    source: "iana",
    extensions: [
      "siv",
      "sieve"
    ]
  },
  "application/simple-filter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/simple-message-summary": {
    source: "iana"
  },
  "application/simplesymbolcontainer": {
    source: "iana"
  },
  "application/sipc": {
    source: "iana"
  },
  "application/slate": {
    source: "iana"
  },
  "application/smil": {
    source: "iana"
  },
  "application/smil+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "smi",
      "smil"
    ]
  },
  "application/smpte336m": {
    source: "iana"
  },
  "application/soap+fastinfoset": {
    source: "iana"
  },
  "application/soap+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sparql-query": {
    source: "iana",
    extensions: [
      "rq"
    ]
  },
  "application/sparql-results+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "srx"
    ]
  },
  "application/spdx+json": {
    source: "iana",
    compressible: !0
  },
  "application/spirits-event+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sql": {
    source: "iana"
  },
  "application/srgs": {
    source: "iana",
    extensions: [
      "gram"
    ]
  },
  "application/srgs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "grxml"
    ]
  },
  "application/sru+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sru"
    ]
  },
  "application/ssdl+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ssdl"
    ]
  },
  "application/ssml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ssml"
    ]
  },
  "application/stix+json": {
    source: "iana",
    compressible: !0
  },
  "application/swid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "swidtag"
    ]
  },
  "application/tamp-apex-update": {
    source: "iana"
  },
  "application/tamp-apex-update-confirm": {
    source: "iana"
  },
  "application/tamp-community-update": {
    source: "iana"
  },
  "application/tamp-community-update-confirm": {
    source: "iana"
  },
  "application/tamp-error": {
    source: "iana"
  },
  "application/tamp-sequence-adjust": {
    source: "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    source: "iana"
  },
  "application/tamp-status-query": {
    source: "iana"
  },
  "application/tamp-status-response": {
    source: "iana"
  },
  "application/tamp-update": {
    source: "iana"
  },
  "application/tamp-update-confirm": {
    source: "iana"
  },
  "application/tar": {
    compressible: !0
  },
  "application/taxii+json": {
    source: "iana",
    compressible: !0
  },
  "application/td+json": {
    source: "iana",
    compressible: !0
  },
  "application/tei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tei",
      "teicorpus"
    ]
  },
  "application/tetra_isi": {
    source: "iana"
  },
  "application/thraud+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tfi"
    ]
  },
  "application/timestamp-query": {
    source: "iana"
  },
  "application/timestamp-reply": {
    source: "iana"
  },
  "application/timestamped-data": {
    source: "iana",
    extensions: [
      "tsd"
    ]
  },
  "application/tlsrpt+gzip": {
    source: "iana"
  },
  "application/tlsrpt+json": {
    source: "iana",
    compressible: !0
  },
  "application/tnauthlist": {
    source: "iana"
  },
  "application/token-introspection+jwt": {
    source: "iana"
  },
  "application/toml": {
    compressible: !0,
    extensions: [
      "toml"
    ]
  },
  "application/trickle-ice-sdpfrag": {
    source: "iana"
  },
  "application/trig": {
    source: "iana",
    extensions: [
      "trig"
    ]
  },
  "application/ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttml"
    ]
  },
  "application/tve-trigger": {
    source: "iana"
  },
  "application/tzif": {
    source: "iana"
  },
  "application/tzif-leap": {
    source: "iana"
  },
  "application/ubjson": {
    compressible: !1,
    extensions: [
      "ubj"
    ]
  },
  "application/ulpfec": {
    source: "iana"
  },
  "application/urc-grpsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/urc-ressheet+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsheet"
    ]
  },
  "application/urc-targetdesc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "td"
    ]
  },
  "application/urc-uisocketdesc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+json": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vemmi": {
    source: "iana"
  },
  "application/vividence.scriptfile": {
    source: "apache"
  },
  "application/vnd.1000minds.decision-model+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "1km"
    ]
  },
  "application/vnd.3gpp-prose+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-prose-pc3ch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-v2x-local-service-information": {
    source: "iana"
  },
  "application/vnd.3gpp.5gnas": {
    source: "iana"
  },
  "application/vnd.3gpp.access-transfer-events+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.bsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gmop+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gtpc": {
    source: "iana"
  },
  "application/vnd.3gpp.interworking-data": {
    source: "iana"
  },
  "application/vnd.3gpp.lpp": {
    source: "iana"
  },
  "application/vnd.3gpp.mc-signalling-ear": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-payload": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-signalling": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-floor-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-signed+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mid-call+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ngap": {
    source: "iana"
  },
  "application/vnd.3gpp.pfcp": {
    source: "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    source: "iana",
    extensions: [
      "plb"
    ]
  },
  "application/vnd.3gpp.pic-bw-small": {
    source: "iana",
    extensions: [
      "psb"
    ]
  },
  "application/vnd.3gpp.pic-bw-var": {
    source: "iana",
    extensions: [
      "pvb"
    ]
  },
  "application/vnd.3gpp.s1ap": {
    source: "iana"
  },
  "application/vnd.3gpp.sms": {
    source: "iana"
  },
  "application/vnd.3gpp.sms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-ext+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.state-and-event-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ussd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.sms": {
    source: "iana"
  },
  "application/vnd.3gpp2.tcap": {
    source: "iana",
    extensions: [
      "tcap"
    ]
  },
  "application/vnd.3lightssoftware.imagescal": {
    source: "iana"
  },
  "application/vnd.3m.post-it-notes": {
    source: "iana",
    extensions: [
      "pwn"
    ]
  },
  "application/vnd.accpac.simply.aso": {
    source: "iana",
    extensions: [
      "aso"
    ]
  },
  "application/vnd.accpac.simply.imp": {
    source: "iana",
    extensions: [
      "imp"
    ]
  },
  "application/vnd.acucobol": {
    source: "iana",
    extensions: [
      "acu"
    ]
  },
  "application/vnd.acucorp": {
    source: "iana",
    extensions: [
      "atc",
      "acutc"
    ]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "air"
    ]
  },
  "application/vnd.adobe.flash.movie": {
    source: "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    source: "iana",
    extensions: [
      "fcdt"
    ]
  },
  "application/vnd.adobe.fxp": {
    source: "iana",
    extensions: [
      "fxp",
      "fxpl"
    ]
  },
  "application/vnd.adobe.partial-upload": {
    source: "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdp"
    ]
  },
  "application/vnd.adobe.xfdf": {
    source: "iana",
    extensions: [
      "xfdf"
    ]
  },
  "application/vnd.aether.imp": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata-pagedef": {
    source: "iana"
  },
  "application/vnd.afpc.cmoca-cmresource": {
    source: "iana"
  },
  "application/vnd.afpc.foca-charset": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codedfont": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codepage": {
    source: "iana"
  },
  "application/vnd.afpc.modca": {
    source: "iana"
  },
  "application/vnd.afpc.modca-cmtable": {
    source: "iana"
  },
  "application/vnd.afpc.modca-formdef": {
    source: "iana"
  },
  "application/vnd.afpc.modca-mediummap": {
    source: "iana"
  },
  "application/vnd.afpc.modca-objectcontainer": {
    source: "iana"
  },
  "application/vnd.afpc.modca-overlay": {
    source: "iana"
  },
  "application/vnd.afpc.modca-pagesegment": {
    source: "iana"
  },
  "application/vnd.age": {
    source: "iana",
    extensions: [
      "age"
    ]
  },
  "application/vnd.ah-barcode": {
    source: "iana"
  },
  "application/vnd.ahead.space": {
    source: "iana",
    extensions: [
      "ahead"
    ]
  },
  "application/vnd.airzip.filesecure.azf": {
    source: "iana",
    extensions: [
      "azf"
    ]
  },
  "application/vnd.airzip.filesecure.azs": {
    source: "iana",
    extensions: [
      "azs"
    ]
  },
  "application/vnd.amadeus+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.amazon.ebook": {
    source: "apache",
    extensions: [
      "azw"
    ]
  },
  "application/vnd.amazon.mobi8-ebook": {
    source: "iana"
  },
  "application/vnd.americandynamics.acc": {
    source: "iana",
    extensions: [
      "acc"
    ]
  },
  "application/vnd.amiga.ami": {
    source: "iana",
    extensions: [
      "ami"
    ]
  },
  "application/vnd.amundsen.maze+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.android.ota": {
    source: "iana"
  },
  "application/vnd.android.package-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "apk"
    ]
  },
  "application/vnd.anki": {
    source: "iana"
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    source: "iana",
    extensions: [
      "cii"
    ]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    source: "apache",
    extensions: [
      "fti"
    ]
  },
  "application/vnd.antix.game-component": {
    source: "iana",
    extensions: [
      "atx"
    ]
  },
  "application/vnd.apache.arrow.file": {
    source: "iana"
  },
  "application/vnd.apache.arrow.stream": {
    source: "iana"
  },
  "application/vnd.apache.thrift.binary": {
    source: "iana"
  },
  "application/vnd.apache.thrift.compact": {
    source: "iana"
  },
  "application/vnd.apache.thrift.json": {
    source: "iana"
  },
  "application/vnd.api+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.aplextor.warrp+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apothekende.reservation+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apple.installer+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpkg"
    ]
  },
  "application/vnd.apple.keynote": {
    source: "iana",
    extensions: [
      "key"
    ]
  },
  "application/vnd.apple.mpegurl": {
    source: "iana",
    extensions: [
      "m3u8"
    ]
  },
  "application/vnd.apple.numbers": {
    source: "iana",
    extensions: [
      "numbers"
    ]
  },
  "application/vnd.apple.pages": {
    source: "iana",
    extensions: [
      "pages"
    ]
  },
  "application/vnd.apple.pkpass": {
    compressible: !1,
    extensions: [
      "pkpass"
    ]
  },
  "application/vnd.arastra.swi": {
    source: "iana"
  },
  "application/vnd.aristanetworks.swi": {
    source: "iana",
    extensions: [
      "swi"
    ]
  },
  "application/vnd.artisan+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.artsquare": {
    source: "iana"
  },
  "application/vnd.astraea-software.iota": {
    source: "iana",
    extensions: [
      "iota"
    ]
  },
  "application/vnd.audiograph": {
    source: "iana",
    extensions: [
      "aep"
    ]
  },
  "application/vnd.autopackage": {
    source: "iana"
  },
  "application/vnd.avalon+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.avistar+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.balsamiq.bmml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmml"
    ]
  },
  "application/vnd.balsamiq.bmpr": {
    source: "iana"
  },
  "application/vnd.banana-accounting": {
    source: "iana"
  },
  "application/vnd.bbf.usp.error": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bekitzur-stech+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bint.med-content": {
    source: "iana"
  },
  "application/vnd.biopax.rdf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.blink-idb-value-wrapper": {
    source: "iana"
  },
  "application/vnd.blueice.multipass": {
    source: "iana",
    extensions: [
      "mpm"
    ]
  },
  "application/vnd.bluetooth.ep.oob": {
    source: "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    source: "iana"
  },
  "application/vnd.bmi": {
    source: "iana",
    extensions: [
      "bmi"
    ]
  },
  "application/vnd.bpf": {
    source: "iana"
  },
  "application/vnd.bpf3": {
    source: "iana"
  },
  "application/vnd.businessobjects": {
    source: "iana",
    extensions: [
      "rep"
    ]
  },
  "application/vnd.byu.uapi+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cab-jscript": {
    source: "iana"
  },
  "application/vnd.canon-cpdl": {
    source: "iana"
  },
  "application/vnd.canon-lips": {
    source: "iana"
  },
  "application/vnd.capasystems-pg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    source: "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    source: "iana"
  },
  "application/vnd.chemdraw+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdxml"
    ]
  },
  "application/vnd.chess-pgn": {
    source: "iana"
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    source: "iana",
    extensions: [
      "mmd"
    ]
  },
  "application/vnd.ciedi": {
    source: "iana"
  },
  "application/vnd.cinderella": {
    source: "iana",
    extensions: [
      "cdy"
    ]
  },
  "application/vnd.cirpack.isdn-ext": {
    source: "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csl"
    ]
  },
  "application/vnd.claymore": {
    source: "iana",
    extensions: [
      "cla"
    ]
  },
  "application/vnd.cloanto.rp9": {
    source: "iana",
    extensions: [
      "rp9"
    ]
  },
  "application/vnd.clonk.c4group": {
    source: "iana",
    extensions: [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    source: "iana",
    extensions: [
      "c11amc"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    source: "iana",
    extensions: [
      "c11amz"
    ]
  },
  "application/vnd.coffeescript": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet-template": {
    source: "iana"
  },
  "application/vnd.collection+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.doc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.next+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.comicbook+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.comicbook-rar": {
    source: "iana"
  },
  "application/vnd.commerce-battelle": {
    source: "iana"
  },
  "application/vnd.commonspace": {
    source: "iana",
    extensions: [
      "csp"
    ]
  },
  "application/vnd.contact.cmsg": {
    source: "iana",
    extensions: [
      "cdbcmsg"
    ]
  },
  "application/vnd.coreos.ignition+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cosmocaller": {
    source: "iana",
    extensions: [
      "cmc"
    ]
  },
  "application/vnd.crick.clicker": {
    source: "iana",
    extensions: [
      "clkx"
    ]
  },
  "application/vnd.crick.clicker.keyboard": {
    source: "iana",
    extensions: [
      "clkk"
    ]
  },
  "application/vnd.crick.clicker.palette": {
    source: "iana",
    extensions: [
      "clkp"
    ]
  },
  "application/vnd.crick.clicker.template": {
    source: "iana",
    extensions: [
      "clkt"
    ]
  },
  "application/vnd.crick.clicker.wordbank": {
    source: "iana",
    extensions: [
      "clkw"
    ]
  },
  "application/vnd.criticaltools.wbs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wbs"
    ]
  },
  "application/vnd.cryptii.pipe+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.crypto-shade-file": {
    source: "iana"
  },
  "application/vnd.cryptomator.encrypted": {
    source: "iana"
  },
  "application/vnd.cryptomator.vault": {
    source: "iana"
  },
  "application/vnd.ctc-posml": {
    source: "iana",
    extensions: [
      "pml"
    ]
  },
  "application/vnd.ctct.ws+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cups-pdf": {
    source: "iana"
  },
  "application/vnd.cups-postscript": {
    source: "iana"
  },
  "application/vnd.cups-ppd": {
    source: "iana",
    extensions: [
      "ppd"
    ]
  },
  "application/vnd.cups-raster": {
    source: "iana"
  },
  "application/vnd.cups-raw": {
    source: "iana"
  },
  "application/vnd.curl": {
    source: "iana"
  },
  "application/vnd.curl.car": {
    source: "apache",
    extensions: [
      "car"
    ]
  },
  "application/vnd.curl.pcurl": {
    source: "apache",
    extensions: [
      "pcurl"
    ]
  },
  "application/vnd.cyan.dean.root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cybank": {
    source: "iana"
  },
  "application/vnd.cyclonedx+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cyclonedx+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.d2l.coursepackage1p0+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.d3m-dataset": {
    source: "iana"
  },
  "application/vnd.d3m-problem": {
    source: "iana"
  },
  "application/vnd.dart": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dart"
    ]
  },
  "application/vnd.data-vision.rdz": {
    source: "iana",
    extensions: [
      "rdz"
    ]
  },
  "application/vnd.datapackage+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dataresource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dbf": {
    source: "iana",
    extensions: [
      "dbf"
    ]
  },
  "application/vnd.debian.binary-package": {
    source: "iana"
  },
  "application/vnd.dece.data": {
    source: "iana",
    extensions: [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uvt",
      "uvvt"
    ]
  },
  "application/vnd.dece.unspecified": {
    source: "iana",
    extensions: [
      "uvx",
      "uvvx"
    ]
  },
  "application/vnd.dece.zip": {
    source: "iana",
    extensions: [
      "uvz",
      "uvvz"
    ]
  },
  "application/vnd.denovo.fcselayout-link": {
    source: "iana",
    extensions: [
      "fe_launch"
    ]
  },
  "application/vnd.desmume.movie": {
    source: "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    source: "iana"
  },
  "application/vnd.dm.delegation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dna": {
    source: "iana",
    extensions: [
      "dna"
    ]
  },
  "application/vnd.document+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dolby.mlp": {
    source: "apache",
    extensions: [
      "mlp"
    ]
  },
  "application/vnd.dolby.mobile.1": {
    source: "iana"
  },
  "application/vnd.dolby.mobile.2": {
    source: "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    source: "iana"
  },
  "application/vnd.dpgraph": {
    source: "iana",
    extensions: [
      "dpg"
    ]
  },
  "application/vnd.dreamfactory": {
    source: "iana",
    extensions: [
      "dfac"
    ]
  },
  "application/vnd.drive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ds-keypoint": {
    source: "apache",
    extensions: [
      "kpxx"
    ]
  },
  "application/vnd.dtg.local": {
    source: "iana"
  },
  "application/vnd.dtg.local.flash": {
    source: "iana"
  },
  "application/vnd.dtg.local.html": {
    source: "iana"
  },
  "application/vnd.dvb.ait": {
    source: "iana",
    extensions: [
      "ait"
    ]
  },
  "application/vnd.dvb.dvbisl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.dvbj": {
    source: "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    source: "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-container+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-generic+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-init+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.pfr": {
    source: "iana"
  },
  "application/vnd.dvb.service": {
    source: "iana",
    extensions: [
      "svc"
    ]
  },
  "application/vnd.dxr": {
    source: "iana"
  },
  "application/vnd.dynageo": {
    source: "iana",
    extensions: [
      "geo"
    ]
  },
  "application/vnd.dzr": {
    source: "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    source: "iana"
  },
  "application/vnd.ecdis-update": {
    source: "iana"
  },
  "application/vnd.ecip.rlp": {
    source: "iana"
  },
  "application/vnd.eclipse.ditto+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ecowin.chart": {
    source: "iana",
    extensions: [
      "mag"
    ]
  },
  "application/vnd.ecowin.filerequest": {
    source: "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    source: "iana"
  },
  "application/vnd.ecowin.series": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    source: "iana"
  },
  "application/vnd.efi.img": {
    source: "iana"
  },
  "application/vnd.efi.iso": {
    source: "iana"
  },
  "application/vnd.emclient.accessrequest+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.enliven": {
    source: "iana",
    extensions: [
      "nml"
    ]
  },
  "application/vnd.enphase.envoy": {
    source: "iana"
  },
  "application/vnd.eprints.data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.epson.esf": {
    source: "iana",
    extensions: [
      "esf"
    ]
  },
  "application/vnd.epson.msf": {
    source: "iana",
    extensions: [
      "msf"
    ]
  },
  "application/vnd.epson.quickanime": {
    source: "iana",
    extensions: [
      "qam"
    ]
  },
  "application/vnd.epson.salt": {
    source: "iana",
    extensions: [
      "slt"
    ]
  },
  "application/vnd.epson.ssf": {
    source: "iana",
    extensions: [
      "ssf"
    ]
  },
  "application/vnd.ericsson.quickcall": {
    source: "iana"
  },
  "application/vnd.espass-espass+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.eszigno3+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es3",
      "et3"
    ]
  },
  "application/vnd.etsi.aoc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.asic-e+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.asic-s+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.cug+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvcommand+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvservice+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mcid+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mheg5": {
    source: "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.pstn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.sci+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.simservs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.timestamp-token": {
    source: "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.tsl.der": {
    source: "iana"
  },
  "application/vnd.eu.kasparian.car+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.eudora.data": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.profile": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.settings": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.theme": {
    source: "iana"
  },
  "application/vnd.exstream-empower+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.exstream-package": {
    source: "iana"
  },
  "application/vnd.ezpix-album": {
    source: "iana",
    extensions: [
      "ez2"
    ]
  },
  "application/vnd.ezpix-package": {
    source: "iana",
    extensions: [
      "ez3"
    ]
  },
  "application/vnd.f-secure.mobile": {
    source: "iana"
  },
  "application/vnd.familysearch.gedcom+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.fastcopy-disk-image": {
    source: "iana"
  },
  "application/vnd.fdf": {
    source: "iana",
    extensions: [
      "fdf"
    ]
  },
  "application/vnd.fdsn.mseed": {
    source: "iana",
    extensions: [
      "mseed"
    ]
  },
  "application/vnd.fdsn.seed": {
    source: "iana",
    extensions: [
      "seed",
      "dataless"
    ]
  },
  "application/vnd.ffsns": {
    source: "iana"
  },
  "application/vnd.ficlab.flb+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.filmit.zfc": {
    source: "iana"
  },
  "application/vnd.fints": {
    source: "iana"
  },
  "application/vnd.firemonkeys.cloudcell": {
    source: "iana"
  },
  "application/vnd.flographit": {
    source: "iana",
    extensions: [
      "gph"
    ]
  },
  "application/vnd.fluxtime.clip": {
    source: "iana",
    extensions: [
      "ftc"
    ]
  },
  "application/vnd.font-fontforge-sfd": {
    source: "iana"
  },
  "application/vnd.framemaker": {
    source: "iana",
    extensions: [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.frogans.fnc": {
    source: "iana",
    extensions: [
      "fnc"
    ]
  },
  "application/vnd.frogans.ltf": {
    source: "iana",
    extensions: [
      "ltf"
    ]
  },
  "application/vnd.fsc.weblaunch": {
    source: "iana",
    extensions: [
      "fsc"
    ]
  },
  "application/vnd.fujifilm.fb.docuworks": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.binder": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.jfi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fujitsu.oasys": {
    source: "iana",
    extensions: [
      "oas"
    ]
  },
  "application/vnd.fujitsu.oasys2": {
    source: "iana",
    extensions: [
      "oa2"
    ]
  },
  "application/vnd.fujitsu.oasys3": {
    source: "iana",
    extensions: [
      "oa3"
    ]
  },
  "application/vnd.fujitsu.oasysgp": {
    source: "iana",
    extensions: [
      "fg5"
    ]
  },
  "application/vnd.fujitsu.oasysprs": {
    source: "iana",
    extensions: [
      "bh2"
    ]
  },
  "application/vnd.fujixerox.art-ex": {
    source: "iana"
  },
  "application/vnd.fujixerox.art4": {
    source: "iana"
  },
  "application/vnd.fujixerox.ddd": {
    source: "iana",
    extensions: [
      "ddd"
    ]
  },
  "application/vnd.fujixerox.docuworks": {
    source: "iana",
    extensions: [
      "xdw"
    ]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    source: "iana",
    extensions: [
      "xbd"
    ]
  },
  "application/vnd.fujixerox.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    source: "iana"
  },
  "application/vnd.fut-misnet": {
    source: "iana"
  },
  "application/vnd.futoin+cbor": {
    source: "iana"
  },
  "application/vnd.futoin+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fuzzysheet": {
    source: "iana",
    extensions: [
      "fzs"
    ]
  },
  "application/vnd.genomatix.tuxedo": {
    source: "iana",
    extensions: [
      "txd"
    ]
  },
  "application/vnd.gentics.grd+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geo+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geocube+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geogebra.file": {
    source: "iana",
    extensions: [
      "ggb"
    ]
  },
  "application/vnd.geogebra.slides": {
    source: "iana"
  },
  "application/vnd.geogebra.tool": {
    source: "iana",
    extensions: [
      "ggt"
    ]
  },
  "application/vnd.geometry-explorer": {
    source: "iana",
    extensions: [
      "gex",
      "gre"
    ]
  },
  "application/vnd.geonext": {
    source: "iana",
    extensions: [
      "gxt"
    ]
  },
  "application/vnd.geoplan": {
    source: "iana",
    extensions: [
      "g2w"
    ]
  },
  "application/vnd.geospace": {
    source: "iana",
    extensions: [
      "g3w"
    ]
  },
  "application/vnd.gerber": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    source: "iana"
  },
  "application/vnd.gmx": {
    source: "iana",
    extensions: [
      "gmx"
    ]
  },
  "application/vnd.google-apps.document": {
    compressible: !1,
    extensions: [
      "gdoc"
    ]
  },
  "application/vnd.google-apps.presentation": {
    compressible: !1,
    extensions: [
      "gslides"
    ]
  },
  "application/vnd.google-apps.spreadsheet": {
    compressible: !1,
    extensions: [
      "gsheet"
    ]
  },
  "application/vnd.google-earth.kml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "kml"
    ]
  },
  "application/vnd.google-earth.kmz": {
    source: "iana",
    compressible: !1,
    extensions: [
      "kmz"
    ]
  },
  "application/vnd.gov.sk.e-form+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.gov.sk.e-form+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.grafeq": {
    source: "iana",
    extensions: [
      "gqf",
      "gqs"
    ]
  },
  "application/vnd.gridmp": {
    source: "iana"
  },
  "application/vnd.groove-account": {
    source: "iana",
    extensions: [
      "gac"
    ]
  },
  "application/vnd.groove-help": {
    source: "iana",
    extensions: [
      "ghf"
    ]
  },
  "application/vnd.groove-identity-message": {
    source: "iana",
    extensions: [
      "gim"
    ]
  },
  "application/vnd.groove-injector": {
    source: "iana",
    extensions: [
      "grv"
    ]
  },
  "application/vnd.groove-tool-message": {
    source: "iana",
    extensions: [
      "gtm"
    ]
  },
  "application/vnd.groove-tool-template": {
    source: "iana",
    extensions: [
      "tpl"
    ]
  },
  "application/vnd.groove-vcard": {
    source: "iana",
    extensions: [
      "vcg"
    ]
  },
  "application/vnd.hal+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hal+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "hal"
    ]
  },
  "application/vnd.handheld-entertainment+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zmm"
    ]
  },
  "application/vnd.hbci": {
    source: "iana",
    extensions: [
      "hbci"
    ]
  },
  "application/vnd.hc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hcl-bireports": {
    source: "iana"
  },
  "application/vnd.hdt": {
    source: "iana"
  },
  "application/vnd.heroku+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hhe.lesson-player": {
    source: "iana",
    extensions: [
      "les"
    ]
  },
  "application/vnd.hl7cda+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hl7v2+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hp-hpgl": {
    source: "iana",
    extensions: [
      "hpgl"
    ]
  },
  "application/vnd.hp-hpid": {
    source: "iana",
    extensions: [
      "hpid"
    ]
  },
  "application/vnd.hp-hps": {
    source: "iana",
    extensions: [
      "hps"
    ]
  },
  "application/vnd.hp-jlyt": {
    source: "iana",
    extensions: [
      "jlt"
    ]
  },
  "application/vnd.hp-pcl": {
    source: "iana",
    extensions: [
      "pcl"
    ]
  },
  "application/vnd.hp-pclxl": {
    source: "iana",
    extensions: [
      "pclxl"
    ]
  },
  "application/vnd.httphone": {
    source: "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    source: "iana",
    extensions: [
      "sfd-hdstx"
    ]
  },
  "application/vnd.hyper+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyper-item+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyperdrive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hzn-3d-crossword": {
    source: "iana"
  },
  "application/vnd.ibm.afplinedata": {
    source: "iana"
  },
  "application/vnd.ibm.electronic-media": {
    source: "iana"
  },
  "application/vnd.ibm.minipay": {
    source: "iana",
    extensions: [
      "mpy"
    ]
  },
  "application/vnd.ibm.modcap": {
    source: "iana",
    extensions: [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    source: "iana",
    extensions: [
      "irm"
    ]
  },
  "application/vnd.ibm.secure-container": {
    source: "iana",
    extensions: [
      "sc"
    ]
  },
  "application/vnd.iccprofile": {
    source: "iana",
    extensions: [
      "icc",
      "icm"
    ]
  },
  "application/vnd.ieee.1905": {
    source: "iana"
  },
  "application/vnd.igloader": {
    source: "iana",
    extensions: [
      "igl"
    ]
  },
  "application/vnd.imagemeter.folder+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.imagemeter.image+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.immervision-ivp": {
    source: "iana",
    extensions: [
      "ivp"
    ]
  },
  "application/vnd.immervision-ivu": {
    source: "iana",
    extensions: [
      "ivu"
    ]
  },
  "application/vnd.ims.imsccv1p1": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    source: "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informedcontrol.rms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informix-visionary": {
    source: "iana"
  },
  "application/vnd.infotech.project": {
    source: "iana"
  },
  "application/vnd.infotech.project+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.innopath.wamp.notification": {
    source: "iana"
  },
  "application/vnd.insors.igm": {
    source: "iana",
    extensions: [
      "igm"
    ]
  },
  "application/vnd.intercon.formnet": {
    source: "iana",
    extensions: [
      "xpw",
      "xpx"
    ]
  },
  "application/vnd.intergeo": {
    source: "iana",
    extensions: [
      "i2g"
    ]
  },
  "application/vnd.intertrust.digibox": {
    source: "iana"
  },
  "application/vnd.intertrust.nncp": {
    source: "iana"
  },
  "application/vnd.intu.qbo": {
    source: "iana",
    extensions: [
      "qbo"
    ]
  },
  "application/vnd.intu.qfx": {
    source: "iana",
    extensions: [
      "qfx"
    ]
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ipunplugged.rcprofile": {
    source: "iana",
    extensions: [
      "rcprofile"
    ]
  },
  "application/vnd.irepository.package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "irp"
    ]
  },
  "application/vnd.is-xpr": {
    source: "iana",
    extensions: [
      "xpr"
    ]
  },
  "application/vnd.isac.fcs": {
    source: "iana",
    extensions: [
      "fcs"
    ]
  },
  "application/vnd.iso11783-10+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.jam": {
    source: "iana",
    extensions: [
      "jam"
    ]
  },
  "application/vnd.japannet-directory-service": {
    source: "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-registration": {
    source: "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-verification": {
    source: "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    source: "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    source: "iana",
    extensions: [
      "rms"
    ]
  },
  "application/vnd.jisp": {
    source: "iana",
    extensions: [
      "jisp"
    ]
  },
  "application/vnd.joost.joda-archive": {
    source: "iana",
    extensions: [
      "joda"
    ]
  },
  "application/vnd.jsk.isdn-ngn": {
    source: "iana"
  },
  "application/vnd.kahootz": {
    source: "iana",
    extensions: [
      "ktz",
      "ktr"
    ]
  },
  "application/vnd.kde.karbon": {
    source: "iana",
    extensions: [
      "karbon"
    ]
  },
  "application/vnd.kde.kchart": {
    source: "iana",
    extensions: [
      "chrt"
    ]
  },
  "application/vnd.kde.kformula": {
    source: "iana",
    extensions: [
      "kfo"
    ]
  },
  "application/vnd.kde.kivio": {
    source: "iana",
    extensions: [
      "flw"
    ]
  },
  "application/vnd.kde.kontour": {
    source: "iana",
    extensions: [
      "kon"
    ]
  },
  "application/vnd.kde.kpresenter": {
    source: "iana",
    extensions: [
      "kpr",
      "kpt"
    ]
  },
  "application/vnd.kde.kspread": {
    source: "iana",
    extensions: [
      "ksp"
    ]
  },
  "application/vnd.kde.kword": {
    source: "iana",
    extensions: [
      "kwd",
      "kwt"
    ]
  },
  "application/vnd.kenameaapp": {
    source: "iana",
    extensions: [
      "htke"
    ]
  },
  "application/vnd.kidspiration": {
    source: "iana",
    extensions: [
      "kia"
    ]
  },
  "application/vnd.kinar": {
    source: "iana",
    extensions: [
      "kne",
      "knp"
    ]
  },
  "application/vnd.koan": {
    source: "iana",
    extensions: [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    source: "iana",
    extensions: [
      "sse"
    ]
  },
  "application/vnd.las": {
    source: "iana"
  },
  "application/vnd.las.las+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.las.las+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lasxml"
    ]
  },
  "application/vnd.laszip": {
    source: "iana"
  },
  "application/vnd.leap+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.liberty-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    source: "iana",
    extensions: [
      "lbd"
    ]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lbe"
    ]
  },
  "application/vnd.logipipe.circuit+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.loom": {
    source: "iana"
  },
  "application/vnd.lotus-1-2-3": {
    source: "iana",
    extensions: [
      "123"
    ]
  },
  "application/vnd.lotus-approach": {
    source: "iana",
    extensions: [
      "apr"
    ]
  },
  "application/vnd.lotus-freelance": {
    source: "iana",
    extensions: [
      "pre"
    ]
  },
  "application/vnd.lotus-notes": {
    source: "iana",
    extensions: [
      "nsf"
    ]
  },
  "application/vnd.lotus-organizer": {
    source: "iana",
    extensions: [
      "org"
    ]
  },
  "application/vnd.lotus-screencam": {
    source: "iana",
    extensions: [
      "scm"
    ]
  },
  "application/vnd.lotus-wordpro": {
    source: "iana",
    extensions: [
      "lwp"
    ]
  },
  "application/vnd.macports.portpkg": {
    source: "iana",
    extensions: [
      "portpkg"
    ]
  },
  "application/vnd.mapbox-vector-tile": {
    source: "iana",
    extensions: [
      "mvt"
    ]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.license+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.mdcf": {
    source: "iana"
  },
  "application/vnd.mason+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.maxar.archive.3tz+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.maxmind.maxmind-db": {
    source: "iana"
  },
  "application/vnd.mcd": {
    source: "iana",
    extensions: [
      "mcd"
    ]
  },
  "application/vnd.medcalcdata": {
    source: "iana",
    extensions: [
      "mc1"
    ]
  },
  "application/vnd.mediastation.cdkey": {
    source: "iana",
    extensions: [
      "cdkey"
    ]
  },
  "application/vnd.meridian-slingshot": {
    source: "iana"
  },
  "application/vnd.mfer": {
    source: "iana",
    extensions: [
      "mwf"
    ]
  },
  "application/vnd.mfmp": {
    source: "iana",
    extensions: [
      "mfm"
    ]
  },
  "application/vnd.micro+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.micrografx.flo": {
    source: "iana",
    extensions: [
      "flo"
    ]
  },
  "application/vnd.micrografx.igx": {
    source: "iana",
    extensions: [
      "igx"
    ]
  },
  "application/vnd.microsoft.portable-executable": {
    source: "iana"
  },
  "application/vnd.microsoft.windows.thumbnail-cache": {
    source: "iana"
  },
  "application/vnd.miele+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.mif": {
    source: "iana",
    extensions: [
      "mif"
    ]
  },
  "application/vnd.minisoft-hp3000-save": {
    source: "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    source: "iana"
  },
  "application/vnd.mobius.daf": {
    source: "iana",
    extensions: [
      "daf"
    ]
  },
  "application/vnd.mobius.dis": {
    source: "iana",
    extensions: [
      "dis"
    ]
  },
  "application/vnd.mobius.mbk": {
    source: "iana",
    extensions: [
      "mbk"
    ]
  },
  "application/vnd.mobius.mqy": {
    source: "iana",
    extensions: [
      "mqy"
    ]
  },
  "application/vnd.mobius.msl": {
    source: "iana",
    extensions: [
      "msl"
    ]
  },
  "application/vnd.mobius.plc": {
    source: "iana",
    extensions: [
      "plc"
    ]
  },
  "application/vnd.mobius.txf": {
    source: "iana",
    extensions: [
      "txf"
    ]
  },
  "application/vnd.mophun.application": {
    source: "iana",
    extensions: [
      "mpn"
    ]
  },
  "application/vnd.mophun.certificate": {
    source: "iana",
    extensions: [
      "mpc"
    ]
  },
  "application/vnd.motorola.flexsuite": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    source: "iana"
  },
  "application/vnd.motorola.iprm": {
    source: "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xul"
    ]
  },
  "application/vnd.ms-3mfdocument": {
    source: "iana"
  },
  "application/vnd.ms-artgalry": {
    source: "iana",
    extensions: [
      "cil"
    ]
  },
  "application/vnd.ms-asf": {
    source: "iana"
  },
  "application/vnd.ms-cab-compressed": {
    source: "iana",
    extensions: [
      "cab"
    ]
  },
  "application/vnd.ms-color.iccprofile": {
    source: "apache"
  },
  "application/vnd.ms-excel": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlam"
    ]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsb"
    ]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsm"
    ]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "xltm"
    ]
  },
  "application/vnd.ms-fontobject": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eot"
    ]
  },
  "application/vnd.ms-htmlhelp": {
    source: "iana",
    extensions: [
      "chm"
    ]
  },
  "application/vnd.ms-ims": {
    source: "iana",
    extensions: [
      "ims"
    ]
  },
  "application/vnd.ms-lrm": {
    source: "iana",
    extensions: [
      "lrm"
    ]
  },
  "application/vnd.ms-office.activex+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-officetheme": {
    source: "iana",
    extensions: [
      "thmx"
    ]
  },
  "application/vnd.ms-opentype": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-outlook": {
    compressible: !1,
    extensions: [
      "msg"
    ]
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    source: "apache"
  },
  "application/vnd.ms-pki.seccat": {
    source: "apache",
    extensions: [
      "cat"
    ]
  },
  "application/vnd.ms-pki.stl": {
    source: "apache",
    extensions: [
      "stl"
    ]
  },
  "application/vnd.ms-playready.initiator+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-powerpoint": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppam"
    ]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    source: "iana",
    extensions: [
      "pptm"
    ]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    source: "iana",
    extensions: [
      "sldm"
    ]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppsm"
    ]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "potm"
    ]
  },
  "application/vnd.ms-printdevicecapabilities+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-printing.printticket+xml": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-printschematicket+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-project": {
    source: "iana",
    extensions: [
      "mpp",
      "mpt"
    ]
  },
  "application/vnd.ms-tnef": {
    source: "iana"
  },
  "application/vnd.ms-windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.nwprinting.oob": {
    source: "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.wsd.oob": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    source: "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    source: "iana",
    extensions: [
      "docm"
    ]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "dotm"
    ]
  },
  "application/vnd.ms-works": {
    source: "iana",
    extensions: [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    source: "iana",
    extensions: [
      "wpl"
    ]
  },
  "application/vnd.ms-xpsdocument": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xps"
    ]
  },
  "application/vnd.msa-disk-image": {
    source: "iana"
  },
  "application/vnd.mseq": {
    source: "iana",
    extensions: [
      "mseq"
    ]
  },
  "application/vnd.msign": {
    source: "iana"
  },
  "application/vnd.multiad.creator": {
    source: "iana"
  },
  "application/vnd.multiad.creator.cif": {
    source: "iana"
  },
  "application/vnd.music-niff": {
    source: "iana"
  },
  "application/vnd.musician": {
    source: "iana",
    extensions: [
      "mus"
    ]
  },
  "application/vnd.muvee.style": {
    source: "iana",
    extensions: [
      "msty"
    ]
  },
  "application/vnd.mynfc": {
    source: "iana",
    extensions: [
      "taglet"
    ]
  },
  "application/vnd.nacamar.ybrid+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ncd.control": {
    source: "iana"
  },
  "application/vnd.ncd.reference": {
    source: "iana"
  },
  "application/vnd.nearst.inv+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nebumind.line": {
    source: "iana"
  },
  "application/vnd.nervana": {
    source: "iana"
  },
  "application/vnd.netfpx": {
    source: "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    source: "iana",
    extensions: [
      "nlu"
    ]
  },
  "application/vnd.nimn": {
    source: "iana"
  },
  "application/vnd.nintendo.nitro.rom": {
    source: "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    source: "iana"
  },
  "application/vnd.nitf": {
    source: "iana",
    extensions: [
      "ntf",
      "nitf"
    ]
  },
  "application/vnd.noblenet-directory": {
    source: "iana",
    extensions: [
      "nnd"
    ]
  },
  "application/vnd.noblenet-sealer": {
    source: "iana",
    extensions: [
      "nns"
    ]
  },
  "application/vnd.noblenet-web": {
    source: "iana",
    extensions: [
      "nnw"
    ]
  },
  "application/vnd.nokia.catalogs": {
    source: "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.conml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.iptv.config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.isds-radio-presets": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ac"
    ]
  },
  "application/vnd.nokia.n-gage.data": {
    source: "iana",
    extensions: [
      "ngdat"
    ]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    source: "iana",
    extensions: [
      "n-gage"
    ]
  },
  "application/vnd.nokia.ncd": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.radio-preset": {
    source: "iana",
    extensions: [
      "rpst"
    ]
  },
  "application/vnd.nokia.radio-presets": {
    source: "iana",
    extensions: [
      "rpss"
    ]
  },
  "application/vnd.novadigm.edm": {
    source: "iana",
    extensions: [
      "edm"
    ]
  },
  "application/vnd.novadigm.edx": {
    source: "iana",
    extensions: [
      "edx"
    ]
  },
  "application/vnd.novadigm.ext": {
    source: "iana",
    extensions: [
      "ext"
    ]
  },
  "application/vnd.ntt-local.content-share": {
    source: "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    source: "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    source: "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    source: "iana",
    extensions: [
      "odc"
    ]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    source: "iana",
    extensions: [
      "otc"
    ]
  },
  "application/vnd.oasis.opendocument.database": {
    source: "iana",
    extensions: [
      "odb"
    ]
  },
  "application/vnd.oasis.opendocument.formula": {
    source: "iana",
    extensions: [
      "odf"
    ]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    source: "iana",
    extensions: [
      "odft"
    ]
  },
  "application/vnd.oasis.opendocument.graphics": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odg"
    ]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    source: "iana",
    extensions: [
      "otg"
    ]
  },
  "application/vnd.oasis.opendocument.image": {
    source: "iana",
    extensions: [
      "odi"
    ]
  },
  "application/vnd.oasis.opendocument.image-template": {
    source: "iana",
    extensions: [
      "oti"
    ]
  },
  "application/vnd.oasis.opendocument.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odp"
    ]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    source: "iana",
    extensions: [
      "otp"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ods"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    source: "iana",
    extensions: [
      "ots"
    ]
  },
  "application/vnd.oasis.opendocument.text": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odt"
    ]
  },
  "application/vnd.oasis.opendocument.text-master": {
    source: "iana",
    extensions: [
      "odm"
    ]
  },
  "application/vnd.oasis.opendocument.text-template": {
    source: "iana",
    extensions: [
      "ott"
    ]
  },
  "application/vnd.oasis.opendocument.text-web": {
    source: "iana",
    extensions: [
      "oth"
    ]
  },
  "application/vnd.obn": {
    source: "iana"
  },
  "application/vnd.ocf+cbor": {
    source: "iana"
  },
  "application/vnd.oci.image.manifest.v1+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oftn.l10n+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.cspg-hexbinary": {
    source: "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.pae.gem": {
    source: "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.spdlist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.ueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.userprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.olpc-sugar": {
    source: "iana",
    extensions: [
      "xo"
    ]
  },
  "application/vnd.oma-scws-config": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-request": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-response": {
    source: "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.imd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.ltkm": {
    source: "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sgdu": {
    source: "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    source: "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sprov+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.stkm": {
    source: "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-pcc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.dcd": {
    source: "iana"
  },
  "application/vnd.oma.dcdc": {
    source: "iana"
  },
  "application/vnd.oma.dd2+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dd2"
    ]
  },
  "application/vnd.oma.drm.risd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.group-usage-list+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+cbor": {
    source: "iana"
  },
  "application/vnd.oma.lwm2m+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+tlv": {
    source: "iana"
  },
  "application/vnd.oma.pal+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.final-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.groups+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.push": {
    source: "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.xcap-directory+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.omads-email+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-file+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-folder+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omaloc-supl-init": {
    source: "iana"
  },
  "application/vnd.onepager": {
    source: "iana"
  },
  "application/vnd.onepagertamp": {
    source: "iana"
  },
  "application/vnd.onepagertamx": {
    source: "iana"
  },
  "application/vnd.onepagertat": {
    source: "iana"
  },
  "application/vnd.onepagertatp": {
    source: "iana"
  },
  "application/vnd.onepagertatx": {
    source: "iana"
  },
  "application/vnd.openblox.game+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "obgx"
    ]
  },
  "application/vnd.openblox.game-binary": {
    source: "iana"
  },
  "application/vnd.openeye.oeb": {
    source: "iana"
  },
  "application/vnd.openofficeorg.extension": {
    source: "apache",
    extensions: [
      "oxt"
    ]
  },
  "application/vnd.openstreetmap.data+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osm"
    ]
  },
  "application/vnd.opentimestamps.ots": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pptx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    source: "iana",
    extensions: [
      "sldx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    source: "iana",
    extensions: [
      "ppsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    source: "iana",
    extensions: [
      "potx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xlsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    source: "iana",
    extensions: [
      "xltx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    source: "iana",
    compressible: !1,
    extensions: [
      "docx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    source: "iana",
    extensions: [
      "dotx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oracle.resource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.orange.indata": {
    source: "iana"
  },
  "application/vnd.osa.netdeploy": {
    source: "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    source: "iana",
    extensions: [
      "mgp"
    ]
  },
  "application/vnd.osgi.bundle": {
    source: "iana"
  },
  "application/vnd.osgi.dp": {
    source: "iana",
    extensions: [
      "dp"
    ]
  },
  "application/vnd.osgi.subsystem": {
    source: "iana",
    extensions: [
      "esa"
    ]
  },
  "application/vnd.otps.ct-kip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oxli.countgraph": {
    source: "iana"
  },
  "application/vnd.pagerduty+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.palm": {
    source: "iana",
    extensions: [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.panoply": {
    source: "iana"
  },
  "application/vnd.paos.xml": {
    source: "iana"
  },
  "application/vnd.patentdive": {
    source: "iana"
  },
  "application/vnd.patientecommsdoc": {
    source: "iana"
  },
  "application/vnd.pawaafile": {
    source: "iana",
    extensions: [
      "paw"
    ]
  },
  "application/vnd.pcos": {
    source: "iana"
  },
  "application/vnd.pg.format": {
    source: "iana",
    extensions: [
      "str"
    ]
  },
  "application/vnd.pg.osasli": {
    source: "iana",
    extensions: [
      "ei6"
    ]
  },
  "application/vnd.piaccess.application-licence": {
    source: "iana"
  },
  "application/vnd.picsel": {
    source: "iana",
    extensions: [
      "efif"
    ]
  },
  "application/vnd.pmi.widget": {
    source: "iana",
    extensions: [
      "wg"
    ]
  },
  "application/vnd.poc.group-advertisement+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.pocketlearn": {
    source: "iana",
    extensions: [
      "plf"
    ]
  },
  "application/vnd.powerbuilder6": {
    source: "iana",
    extensions: [
      "pbd"
    ]
  },
  "application/vnd.powerbuilder6-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder7": {
    source: "iana"
  },
  "application/vnd.powerbuilder7-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder75": {
    source: "iana"
  },
  "application/vnd.powerbuilder75-s": {
    source: "iana"
  },
  "application/vnd.preminet": {
    source: "iana"
  },
  "application/vnd.previewsystems.box": {
    source: "iana",
    extensions: [
      "box"
    ]
  },
  "application/vnd.proteus.magazine": {
    source: "iana",
    extensions: [
      "mgz"
    ]
  },
  "application/vnd.psfs": {
    source: "iana"
  },
  "application/vnd.publishare-delta-tree": {
    source: "iana",
    extensions: [
      "qps"
    ]
  },
  "application/vnd.pvi.ptid1": {
    source: "iana",
    extensions: [
      "ptid"
    ]
  },
  "application/vnd.pwg-multiplexed": {
    source: "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.qualcomm.brew-app-res": {
    source: "iana"
  },
  "application/vnd.quarantainenet": {
    source: "iana"
  },
  "application/vnd.quark.quarkxpress": {
    source: "iana",
    extensions: [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.quobject-quoxdocument": {
    source: "iana"
  },
  "application/vnd.radisys.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rainstor.data": {
    source: "iana"
  },
  "application/vnd.rapid": {
    source: "iana"
  },
  "application/vnd.rar": {
    source: "iana",
    extensions: [
      "rar"
    ]
  },
  "application/vnd.realvnc.bed": {
    source: "iana",
    extensions: [
      "bed"
    ]
  },
  "application/vnd.recordare.musicxml": {
    source: "iana",
    extensions: [
      "mxl"
    ]
  },
  "application/vnd.recordare.musicxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musicxml"
    ]
  },
  "application/vnd.renlearn.rlprint": {
    source: "iana"
  },
  "application/vnd.resilient.logic": {
    source: "iana"
  },
  "application/vnd.restful+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rig.cryptonote": {
    source: "iana",
    extensions: [
      "cryptonote"
    ]
  },
  "application/vnd.rim.cod": {
    source: "apache",
    extensions: [
      "cod"
    ]
  },
  "application/vnd.rn-realmedia": {
    source: "apache",
    extensions: [
      "rm"
    ]
  },
  "application/vnd.rn-realmedia-vbr": {
    source: "apache",
    extensions: [
      "rmvb"
    ]
  },
  "application/vnd.route66.link66+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "link66"
    ]
  },
  "application/vnd.rs-274x": {
    source: "iana"
  },
  "application/vnd.ruckus.download": {
    source: "iana"
  },
  "application/vnd.s3sms": {
    source: "iana"
  },
  "application/vnd.sailingtracker.track": {
    source: "iana",
    extensions: [
      "st"
    ]
  },
  "application/vnd.sar": {
    source: "iana"
  },
  "application/vnd.sbm.cid": {
    source: "iana"
  },
  "application/vnd.sbm.mid2": {
    source: "iana"
  },
  "application/vnd.scribus": {
    source: "iana"
  },
  "application/vnd.sealed.3df": {
    source: "iana"
  },
  "application/vnd.sealed.csf": {
    source: "iana"
  },
  "application/vnd.sealed.doc": {
    source: "iana"
  },
  "application/vnd.sealed.eml": {
    source: "iana"
  },
  "application/vnd.sealed.mht": {
    source: "iana"
  },
  "application/vnd.sealed.net": {
    source: "iana"
  },
  "application/vnd.sealed.ppt": {
    source: "iana"
  },
  "application/vnd.sealed.tiff": {
    source: "iana"
  },
  "application/vnd.sealed.xls": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    source: "iana"
  },
  "application/vnd.seemail": {
    source: "iana",
    extensions: [
      "see"
    ]
  },
  "application/vnd.seis+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.sema": {
    source: "iana",
    extensions: [
      "sema"
    ]
  },
  "application/vnd.semd": {
    source: "iana",
    extensions: [
      "semd"
    ]
  },
  "application/vnd.semf": {
    source: "iana",
    extensions: [
      "semf"
    ]
  },
  "application/vnd.shade-save-file": {
    source: "iana"
  },
  "application/vnd.shana.informed.formdata": {
    source: "iana",
    extensions: [
      "ifm"
    ]
  },
  "application/vnd.shana.informed.formtemplate": {
    source: "iana",
    extensions: [
      "itp"
    ]
  },
  "application/vnd.shana.informed.interchange": {
    source: "iana",
    extensions: [
      "iif"
    ]
  },
  "application/vnd.shana.informed.package": {
    source: "iana",
    extensions: [
      "ipk"
    ]
  },
  "application/vnd.shootproof+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shopkick+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shp": {
    source: "iana"
  },
  "application/vnd.shx": {
    source: "iana"
  },
  "application/vnd.sigrok.session": {
    source: "iana"
  },
  "application/vnd.simtech-mindmapper": {
    source: "iana",
    extensions: [
      "twd",
      "twds"
    ]
  },
  "application/vnd.siren+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.smaf": {
    source: "iana",
    extensions: [
      "mmf"
    ]
  },
  "application/vnd.smart.notebook": {
    source: "iana"
  },
  "application/vnd.smart.teacher": {
    source: "iana",
    extensions: [
      "teacher"
    ]
  },
  "application/vnd.snesdev-page-table": {
    source: "iana"
  },
  "application/vnd.software602.filler.form+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fo"
    ]
  },
  "application/vnd.software602.filler.form-xml-zip": {
    source: "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sdkm",
      "sdkd"
    ]
  },
  "application/vnd.spotfire.dxp": {
    source: "iana",
    extensions: [
      "dxp"
    ]
  },
  "application/vnd.spotfire.sfs": {
    source: "iana",
    extensions: [
      "sfs"
    ]
  },
  "application/vnd.sqlite3": {
    source: "iana"
  },
  "application/vnd.sss-cod": {
    source: "iana"
  },
  "application/vnd.sss-dtf": {
    source: "iana"
  },
  "application/vnd.sss-ntf": {
    source: "iana"
  },
  "application/vnd.stardivision.calc": {
    source: "apache",
    extensions: [
      "sdc"
    ]
  },
  "application/vnd.stardivision.draw": {
    source: "apache",
    extensions: [
      "sda"
    ]
  },
  "application/vnd.stardivision.impress": {
    source: "apache",
    extensions: [
      "sdd"
    ]
  },
  "application/vnd.stardivision.math": {
    source: "apache",
    extensions: [
      "smf"
    ]
  },
  "application/vnd.stardivision.writer": {
    source: "apache",
    extensions: [
      "sdw",
      "vor"
    ]
  },
  "application/vnd.stardivision.writer-global": {
    source: "apache",
    extensions: [
      "sgl"
    ]
  },
  "application/vnd.stepmania.package": {
    source: "iana",
    extensions: [
      "smzip"
    ]
  },
  "application/vnd.stepmania.stepchart": {
    source: "iana",
    extensions: [
      "sm"
    ]
  },
  "application/vnd.street-stream": {
    source: "iana"
  },
  "application/vnd.sun.wadl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wadl"
    ]
  },
  "application/vnd.sun.xml.calc": {
    source: "apache",
    extensions: [
      "sxc"
    ]
  },
  "application/vnd.sun.xml.calc.template": {
    source: "apache",
    extensions: [
      "stc"
    ]
  },
  "application/vnd.sun.xml.draw": {
    source: "apache",
    extensions: [
      "sxd"
    ]
  },
  "application/vnd.sun.xml.draw.template": {
    source: "apache",
    extensions: [
      "std"
    ]
  },
  "application/vnd.sun.xml.impress": {
    source: "apache",
    extensions: [
      "sxi"
    ]
  },
  "application/vnd.sun.xml.impress.template": {
    source: "apache",
    extensions: [
      "sti"
    ]
  },
  "application/vnd.sun.xml.math": {
    source: "apache",
    extensions: [
      "sxm"
    ]
  },
  "application/vnd.sun.xml.writer": {
    source: "apache",
    extensions: [
      "sxw"
    ]
  },
  "application/vnd.sun.xml.writer.global": {
    source: "apache",
    extensions: [
      "sxg"
    ]
  },
  "application/vnd.sun.xml.writer.template": {
    source: "apache",
    extensions: [
      "stw"
    ]
  },
  "application/vnd.sus-calendar": {
    source: "iana",
    extensions: [
      "sus",
      "susp"
    ]
  },
  "application/vnd.svd": {
    source: "iana",
    extensions: [
      "svd"
    ]
  },
  "application/vnd.swiftview-ics": {
    source: "iana"
  },
  "application/vnd.sycle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.syft+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.symbian.install": {
    source: "apache",
    extensions: [
      "sis",
      "sisx"
    ]
  },
  "application/vnd.syncml+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xsm"
    ]
  },
  "application/vnd.syncml.dm+wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "bdm"
    ]
  },
  "application/vnd.syncml.dm+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xdm"
    ]
  },
  "application/vnd.syncml.dm.notification": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "ddf"
    ]
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.syncml.ds.notification": {
    source: "iana"
  },
  "application/vnd.tableschema+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tao.intent-module-archive": {
    source: "iana",
    extensions: [
      "tao"
    ]
  },
  "application/vnd.tcpdump.pcap": {
    source: "iana",
    extensions: [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.think-cell.ppttc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tml": {
    source: "iana"
  },
  "application/vnd.tmobile-livetv": {
    source: "iana",
    extensions: [
      "tmo"
    ]
  },
  "application/vnd.tri.onesource": {
    source: "iana"
  },
  "application/vnd.trid.tpt": {
    source: "iana",
    extensions: [
      "tpt"
    ]
  },
  "application/vnd.triscape.mxs": {
    source: "iana",
    extensions: [
      "mxs"
    ]
  },
  "application/vnd.trueapp": {
    source: "iana",
    extensions: [
      "tra"
    ]
  },
  "application/vnd.truedoc": {
    source: "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    source: "iana"
  },
  "application/vnd.ufdl": {
    source: "iana",
    extensions: [
      "ufd",
      "ufdl"
    ]
  },
  "application/vnd.uiq.theme": {
    source: "iana",
    extensions: [
      "utz"
    ]
  },
  "application/vnd.umajin": {
    source: "iana",
    extensions: [
      "umj"
    ]
  },
  "application/vnd.unity": {
    source: "iana",
    extensions: [
      "unityweb"
    ]
  },
  "application/vnd.uoml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uoml"
    ]
  },
  "application/vnd.uplanet.alert": {
    source: "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.channel": {
    source: "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.list": {
    source: "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.signal": {
    source: "iana"
  },
  "application/vnd.uri-map": {
    source: "iana"
  },
  "application/vnd.valve.source.material": {
    source: "iana"
  },
  "application/vnd.vcx": {
    source: "iana",
    extensions: [
      "vcx"
    ]
  },
  "application/vnd.vd-study": {
    source: "iana"
  },
  "application/vnd.vectorworks": {
    source: "iana"
  },
  "application/vnd.vel+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.verimatrix.vcas": {
    source: "iana"
  },
  "application/vnd.veritone.aion+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.veryant.thin": {
    source: "iana"
  },
  "application/vnd.ves.encrypted": {
    source: "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    source: "iana"
  },
  "application/vnd.visio": {
    source: "iana",
    extensions: [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    source: "iana",
    extensions: [
      "vis"
    ]
  },
  "application/vnd.vividence.scriptfile": {
    source: "iana"
  },
  "application/vnd.vsf": {
    source: "iana",
    extensions: [
      "vsf"
    ]
  },
  "application/vnd.wap.sic": {
    source: "iana"
  },
  "application/vnd.wap.slc": {
    source: "iana"
  },
  "application/vnd.wap.wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "wbxml"
    ]
  },
  "application/vnd.wap.wmlc": {
    source: "iana",
    extensions: [
      "wmlc"
    ]
  },
  "application/vnd.wap.wmlscriptc": {
    source: "iana",
    extensions: [
      "wmlsc"
    ]
  },
  "application/vnd.webturbo": {
    source: "iana",
    extensions: [
      "wtb"
    ]
  },
  "application/vnd.wfa.dpp": {
    source: "iana"
  },
  "application/vnd.wfa.p2p": {
    source: "iana"
  },
  "application/vnd.wfa.wsc": {
    source: "iana"
  },
  "application/vnd.windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.wmc": {
    source: "iana"
  },
  "application/vnd.wmf.bootstrap": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    source: "iana"
  },
  "application/vnd.wolfram.player": {
    source: "iana",
    extensions: [
      "nbp"
    ]
  },
  "application/vnd.wordperfect": {
    source: "iana",
    extensions: [
      "wpd"
    ]
  },
  "application/vnd.wqd": {
    source: "iana",
    extensions: [
      "wqd"
    ]
  },
  "application/vnd.wrq-hp3000-labelled": {
    source: "iana"
  },
  "application/vnd.wt.stf": {
    source: "iana",
    extensions: [
      "stf"
    ]
  },
  "application/vnd.wv.csp+wbxml": {
    source: "iana"
  },
  "application/vnd.wv.csp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.wv.ssp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xacml+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xara": {
    source: "iana",
    extensions: [
      "xar"
    ]
  },
  "application/vnd.xfdl": {
    source: "iana",
    extensions: [
      "xfdl"
    ]
  },
  "application/vnd.xfdl.webform": {
    source: "iana"
  },
  "application/vnd.xmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xmpie.cpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.dpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.plan": {
    source: "iana"
  },
  "application/vnd.xmpie.ppkg": {
    source: "iana"
  },
  "application/vnd.xmpie.xlim": {
    source: "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    source: "iana",
    extensions: [
      "hvd"
    ]
  },
  "application/vnd.yamaha.hv-script": {
    source: "iana",
    extensions: [
      "hvs"
    ]
  },
  "application/vnd.yamaha.hv-voice": {
    source: "iana",
    extensions: [
      "hvp"
    ]
  },
  "application/vnd.yamaha.openscoreformat": {
    source: "iana",
    extensions: [
      "osf"
    ]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osfpvg"
    ]
  },
  "application/vnd.yamaha.remote-setup": {
    source: "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    source: "iana",
    extensions: [
      "saf"
    ]
  },
  "application/vnd.yamaha.smaf-phrase": {
    source: "iana",
    extensions: [
      "spf"
    ]
  },
  "application/vnd.yamaha.through-ngn": {
    source: "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    source: "iana"
  },
  "application/vnd.yaoweme": {
    source: "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    source: "iana",
    extensions: [
      "cmp"
    ]
  },
  "application/vnd.youtube.yt": {
    source: "iana"
  },
  "application/vnd.zul": {
    source: "iana",
    extensions: [
      "zir",
      "zirz"
    ]
  },
  "application/vnd.zzazz.deck+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zaz"
    ]
  },
  "application/voicexml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vxml"
    ]
  },
  "application/voucher-cms+json": {
    source: "iana",
    compressible: !0
  },
  "application/vq-rtcpxr": {
    source: "iana"
  },
  "application/wasm": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wasm"
    ]
  },
  "application/watcherinfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wif"
    ]
  },
  "application/webpush-options+json": {
    source: "iana",
    compressible: !0
  },
  "application/whoispp-query": {
    source: "iana"
  },
  "application/whoispp-response": {
    source: "iana"
  },
  "application/widget": {
    source: "iana",
    extensions: [
      "wgt"
    ]
  },
  "application/winhlp": {
    source: "apache",
    extensions: [
      "hlp"
    ]
  },
  "application/wita": {
    source: "iana"
  },
  "application/wordperfect5.1": {
    source: "iana"
  },
  "application/wsdl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wsdl"
    ]
  },
  "application/wspolicy+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wspolicy"
    ]
  },
  "application/x-7z-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "7z"
    ]
  },
  "application/x-abiword": {
    source: "apache",
    extensions: [
      "abw"
    ]
  },
  "application/x-ace-compressed": {
    source: "apache",
    extensions: [
      "ace"
    ]
  },
  "application/x-amf": {
    source: "apache"
  },
  "application/x-apple-diskimage": {
    source: "apache",
    extensions: [
      "dmg"
    ]
  },
  "application/x-arj": {
    compressible: !1,
    extensions: [
      "arj"
    ]
  },
  "application/x-authorware-bin": {
    source: "apache",
    extensions: [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    source: "apache",
    extensions: [
      "aam"
    ]
  },
  "application/x-authorware-seg": {
    source: "apache",
    extensions: [
      "aas"
    ]
  },
  "application/x-bcpio": {
    source: "apache",
    extensions: [
      "bcpio"
    ]
  },
  "application/x-bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/x-bittorrent": {
    source: "apache",
    extensions: [
      "torrent"
    ]
  },
  "application/x-blorb": {
    source: "apache",
    extensions: [
      "blb",
      "blorb"
    ]
  },
  "application/x-bzip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz"
    ]
  },
  "application/x-bzip2": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz2",
      "boz"
    ]
  },
  "application/x-cbr": {
    source: "apache",
    extensions: [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    source: "apache",
    extensions: [
      "vcd"
    ]
  },
  "application/x-cfs-compressed": {
    source: "apache",
    extensions: [
      "cfs"
    ]
  },
  "application/x-chat": {
    source: "apache",
    extensions: [
      "chat"
    ]
  },
  "application/x-chess-pgn": {
    source: "apache",
    extensions: [
      "pgn"
    ]
  },
  "application/x-chrome-extension": {
    extensions: [
      "crx"
    ]
  },
  "application/x-cocoa": {
    source: "nginx",
    extensions: [
      "cco"
    ]
  },
  "application/x-compress": {
    source: "apache"
  },
  "application/x-conference": {
    source: "apache",
    extensions: [
      "nsc"
    ]
  },
  "application/x-cpio": {
    source: "apache",
    extensions: [
      "cpio"
    ]
  },
  "application/x-csh": {
    source: "apache",
    extensions: [
      "csh"
    ]
  },
  "application/x-deb": {
    compressible: !1
  },
  "application/x-debian-package": {
    source: "apache",
    extensions: [
      "deb",
      "udeb"
    ]
  },
  "application/x-dgc-compressed": {
    source: "apache",
    extensions: [
      "dgc"
    ]
  },
  "application/x-director": {
    source: "apache",
    extensions: [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    source: "apache",
    extensions: [
      "wad"
    ]
  },
  "application/x-dtbncx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ncx"
    ]
  },
  "application/x-dtbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dtb"
    ]
  },
  "application/x-dtbresource+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "res"
    ]
  },
  "application/x-dvi": {
    source: "apache",
    compressible: !1,
    extensions: [
      "dvi"
    ]
  },
  "application/x-envoy": {
    source: "apache",
    extensions: [
      "evy"
    ]
  },
  "application/x-eva": {
    source: "apache",
    extensions: [
      "eva"
    ]
  },
  "application/x-font-bdf": {
    source: "apache",
    extensions: [
      "bdf"
    ]
  },
  "application/x-font-dos": {
    source: "apache"
  },
  "application/x-font-framemaker": {
    source: "apache"
  },
  "application/x-font-ghostscript": {
    source: "apache",
    extensions: [
      "gsf"
    ]
  },
  "application/x-font-libgrx": {
    source: "apache"
  },
  "application/x-font-linux-psf": {
    source: "apache",
    extensions: [
      "psf"
    ]
  },
  "application/x-font-pcf": {
    source: "apache",
    extensions: [
      "pcf"
    ]
  },
  "application/x-font-snf": {
    source: "apache",
    extensions: [
      "snf"
    ]
  },
  "application/x-font-speedo": {
    source: "apache"
  },
  "application/x-font-sunos-news": {
    source: "apache"
  },
  "application/x-font-type1": {
    source: "apache",
    extensions: [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-font-vfont": {
    source: "apache"
  },
  "application/x-freearc": {
    source: "apache",
    extensions: [
      "arc"
    ]
  },
  "application/x-futuresplash": {
    source: "apache",
    extensions: [
      "spl"
    ]
  },
  "application/x-gca-compressed": {
    source: "apache",
    extensions: [
      "gca"
    ]
  },
  "application/x-glulx": {
    source: "apache",
    extensions: [
      "ulx"
    ]
  },
  "application/x-gnumeric": {
    source: "apache",
    extensions: [
      "gnumeric"
    ]
  },
  "application/x-gramps-xml": {
    source: "apache",
    extensions: [
      "gramps"
    ]
  },
  "application/x-gtar": {
    source: "apache",
    extensions: [
      "gtar"
    ]
  },
  "application/x-gzip": {
    source: "apache"
  },
  "application/x-hdf": {
    source: "apache",
    extensions: [
      "hdf"
    ]
  },
  "application/x-httpd-php": {
    compressible: !0,
    extensions: [
      "php"
    ]
  },
  "application/x-install-instructions": {
    source: "apache",
    extensions: [
      "install"
    ]
  },
  "application/x-iso9660-image": {
    source: "apache",
    extensions: [
      "iso"
    ]
  },
  "application/x-iwork-keynote-sffkey": {
    extensions: [
      "key"
    ]
  },
  "application/x-iwork-numbers-sffnumbers": {
    extensions: [
      "numbers"
    ]
  },
  "application/x-iwork-pages-sffpages": {
    extensions: [
      "pages"
    ]
  },
  "application/x-java-archive-diff": {
    source: "nginx",
    extensions: [
      "jardiff"
    ]
  },
  "application/x-java-jnlp-file": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jnlp"
    ]
  },
  "application/x-javascript": {
    compressible: !0
  },
  "application/x-keepass2": {
    extensions: [
      "kdbx"
    ]
  },
  "application/x-latex": {
    source: "apache",
    compressible: !1,
    extensions: [
      "latex"
    ]
  },
  "application/x-lua-bytecode": {
    extensions: [
      "luac"
    ]
  },
  "application/x-lzh-compressed": {
    source: "apache",
    extensions: [
      "lzh",
      "lha"
    ]
  },
  "application/x-makeself": {
    source: "nginx",
    extensions: [
      "run"
    ]
  },
  "application/x-mie": {
    source: "apache",
    extensions: [
      "mie"
    ]
  },
  "application/x-mobipocket-ebook": {
    source: "apache",
    extensions: [
      "prc",
      "mobi"
    ]
  },
  "application/x-mpegurl": {
    compressible: !1
  },
  "application/x-ms-application": {
    source: "apache",
    extensions: [
      "application"
    ]
  },
  "application/x-ms-shortcut": {
    source: "apache",
    extensions: [
      "lnk"
    ]
  },
  "application/x-ms-wmd": {
    source: "apache",
    extensions: [
      "wmd"
    ]
  },
  "application/x-ms-wmz": {
    source: "apache",
    extensions: [
      "wmz"
    ]
  },
  "application/x-ms-xbap": {
    source: "apache",
    extensions: [
      "xbap"
    ]
  },
  "application/x-msaccess": {
    source: "apache",
    extensions: [
      "mdb"
    ]
  },
  "application/x-msbinder": {
    source: "apache",
    extensions: [
      "obd"
    ]
  },
  "application/x-mscardfile": {
    source: "apache",
    extensions: [
      "crd"
    ]
  },
  "application/x-msclip": {
    source: "apache",
    extensions: [
      "clp"
    ]
  },
  "application/x-msdos-program": {
    extensions: [
      "exe"
    ]
  },
  "application/x-msdownload": {
    source: "apache",
    extensions: [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    source: "apache",
    extensions: [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    source: "apache",
    extensions: [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    source: "apache",
    extensions: [
      "mny"
    ]
  },
  "application/x-mspublisher": {
    source: "apache",
    extensions: [
      "pub"
    ]
  },
  "application/x-msschedule": {
    source: "apache",
    extensions: [
      "scd"
    ]
  },
  "application/x-msterminal": {
    source: "apache",
    extensions: [
      "trm"
    ]
  },
  "application/x-mswrite": {
    source: "apache",
    extensions: [
      "wri"
    ]
  },
  "application/x-netcdf": {
    source: "apache",
    extensions: [
      "nc",
      "cdf"
    ]
  },
  "application/x-ns-proxy-autoconfig": {
    compressible: !0,
    extensions: [
      "pac"
    ]
  },
  "application/x-nzb": {
    source: "apache",
    extensions: [
      "nzb"
    ]
  },
  "application/x-perl": {
    source: "nginx",
    extensions: [
      "pl",
      "pm"
    ]
  },
  "application/x-pilot": {
    source: "nginx",
    extensions: [
      "prc",
      "pdb"
    ]
  },
  "application/x-pkcs12": {
    source: "apache",
    compressible: !1,
    extensions: [
      "p12",
      "pfx"
    ]
  },
  "application/x-pkcs7-certificates": {
    source: "apache",
    extensions: [
      "p7b",
      "spc"
    ]
  },
  "application/x-pkcs7-certreqresp": {
    source: "apache",
    extensions: [
      "p7r"
    ]
  },
  "application/x-pki-message": {
    source: "iana"
  },
  "application/x-rar-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "rar"
    ]
  },
  "application/x-redhat-package-manager": {
    source: "nginx",
    extensions: [
      "rpm"
    ]
  },
  "application/x-research-info-systems": {
    source: "apache",
    extensions: [
      "ris"
    ]
  },
  "application/x-sea": {
    source: "nginx",
    extensions: [
      "sea"
    ]
  },
  "application/x-sh": {
    source: "apache",
    compressible: !0,
    extensions: [
      "sh"
    ]
  },
  "application/x-shar": {
    source: "apache",
    extensions: [
      "shar"
    ]
  },
  "application/x-shockwave-flash": {
    source: "apache",
    compressible: !1,
    extensions: [
      "swf"
    ]
  },
  "application/x-silverlight-app": {
    source: "apache",
    extensions: [
      "xap"
    ]
  },
  "application/x-sql": {
    source: "apache",
    extensions: [
      "sql"
    ]
  },
  "application/x-stuffit": {
    source: "apache",
    compressible: !1,
    extensions: [
      "sit"
    ]
  },
  "application/x-stuffitx": {
    source: "apache",
    extensions: [
      "sitx"
    ]
  },
  "application/x-subrip": {
    source: "apache",
    extensions: [
      "srt"
    ]
  },
  "application/x-sv4cpio": {
    source: "apache",
    extensions: [
      "sv4cpio"
    ]
  },
  "application/x-sv4crc": {
    source: "apache",
    extensions: [
      "sv4crc"
    ]
  },
  "application/x-t3vm-image": {
    source: "apache",
    extensions: [
      "t3"
    ]
  },
  "application/x-tads": {
    source: "apache",
    extensions: [
      "gam"
    ]
  },
  "application/x-tar": {
    source: "apache",
    compressible: !0,
    extensions: [
      "tar"
    ]
  },
  "application/x-tcl": {
    source: "apache",
    extensions: [
      "tcl",
      "tk"
    ]
  },
  "application/x-tex": {
    source: "apache",
    extensions: [
      "tex"
    ]
  },
  "application/x-tex-tfm": {
    source: "apache",
    extensions: [
      "tfm"
    ]
  },
  "application/x-texinfo": {
    source: "apache",
    extensions: [
      "texinfo",
      "texi"
    ]
  },
  "application/x-tgif": {
    source: "apache",
    extensions: [
      "obj"
    ]
  },
  "application/x-ustar": {
    source: "apache",
    extensions: [
      "ustar"
    ]
  },
  "application/x-virtualbox-hdd": {
    compressible: !0,
    extensions: [
      "hdd"
    ]
  },
  "application/x-virtualbox-ova": {
    compressible: !0,
    extensions: [
      "ova"
    ]
  },
  "application/x-virtualbox-ovf": {
    compressible: !0,
    extensions: [
      "ovf"
    ]
  },
  "application/x-virtualbox-vbox": {
    compressible: !0,
    extensions: [
      "vbox"
    ]
  },
  "application/x-virtualbox-vbox-extpack": {
    compressible: !1,
    extensions: [
      "vbox-extpack"
    ]
  },
  "application/x-virtualbox-vdi": {
    compressible: !0,
    extensions: [
      "vdi"
    ]
  },
  "application/x-virtualbox-vhd": {
    compressible: !0,
    extensions: [
      "vhd"
    ]
  },
  "application/x-virtualbox-vmdk": {
    compressible: !0,
    extensions: [
      "vmdk"
    ]
  },
  "application/x-wais-source": {
    source: "apache",
    extensions: [
      "src"
    ]
  },
  "application/x-web-app-manifest+json": {
    compressible: !0,
    extensions: [
      "webapp"
    ]
  },
  "application/x-www-form-urlencoded": {
    source: "iana",
    compressible: !0
  },
  "application/x-x509-ca-cert": {
    source: "iana",
    extensions: [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-x509-ca-ra-cert": {
    source: "iana"
  },
  "application/x-x509-next-ca-cert": {
    source: "iana"
  },
  "application/x-xfig": {
    source: "apache",
    extensions: [
      "fig"
    ]
  },
  "application/x-xliff+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/x-xpinstall": {
    source: "apache",
    compressible: !1,
    extensions: [
      "xpi"
    ]
  },
  "application/x-xz": {
    source: "apache",
    extensions: [
      "xz"
    ]
  },
  "application/x-zmachine": {
    source: "apache",
    extensions: [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/x400-bp": {
    source: "iana"
  },
  "application/xacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xaml+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xaml"
    ]
  },
  "application/xcap-att+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xav"
    ]
  },
  "application/xcap-caps+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xca"
    ]
  },
  "application/xcap-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdf"
    ]
  },
  "application/xcap-el+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xel"
    ]
  },
  "application/xcap-error+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcap-ns+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xns"
    ]
  },
  "application/xcon-conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcon-conference-info-diff+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xenc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xenc"
    ]
  },
  "application/xhtml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xhtml",
      "xht"
    ]
  },
  "application/xhtml-voice+xml": {
    source: "apache",
    compressible: !0
  },
  "application/xliff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dtd"
    ]
  },
  "application/xml-external-parsed-entity": {
    source: "iana"
  },
  "application/xml-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xmpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xop+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xop"
    ]
  },
  "application/xproc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xpl"
    ]
  },
  "application/xslt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xsl",
      "xslt"
    ]
  },
  "application/xspf+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xspf"
    ]
  },
  "application/xv+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yang": {
    source: "iana",
    extensions: [
      "yang"
    ]
  },
  "application/yang-data+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yin+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "yin"
    ]
  },
  "application/zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "zip"
    ]
  },
  "application/zlib": {
    source: "iana"
  },
  "application/zstd": {
    source: "iana"
  },
  "audio/1d-interleaved-parityfec": {
    source: "iana"
  },
  "audio/32kadpcm": {
    source: "iana"
  },
  "audio/3gpp": {
    source: "iana",
    compressible: !1,
    extensions: [
      "3gpp"
    ]
  },
  "audio/3gpp2": {
    source: "iana"
  },
  "audio/aac": {
    source: "iana"
  },
  "audio/ac3": {
    source: "iana"
  },
  "audio/adpcm": {
    source: "apache",
    extensions: [
      "adp"
    ]
  },
  "audio/amr": {
    source: "iana",
    extensions: [
      "amr"
    ]
  },
  "audio/amr-wb": {
    source: "iana"
  },
  "audio/amr-wb+": {
    source: "iana"
  },
  "audio/aptx": {
    source: "iana"
  },
  "audio/asc": {
    source: "iana"
  },
  "audio/atrac-advanced-lossless": {
    source: "iana"
  },
  "audio/atrac-x": {
    source: "iana"
  },
  "audio/atrac3": {
    source: "iana"
  },
  "audio/basic": {
    source: "iana",
    compressible: !1,
    extensions: [
      "au",
      "snd"
    ]
  },
  "audio/bv16": {
    source: "iana"
  },
  "audio/bv32": {
    source: "iana"
  },
  "audio/clearmode": {
    source: "iana"
  },
  "audio/cn": {
    source: "iana"
  },
  "audio/dat12": {
    source: "iana"
  },
  "audio/dls": {
    source: "iana"
  },
  "audio/dsr-es201108": {
    source: "iana"
  },
  "audio/dsr-es202050": {
    source: "iana"
  },
  "audio/dsr-es202211": {
    source: "iana"
  },
  "audio/dsr-es202212": {
    source: "iana"
  },
  "audio/dv": {
    source: "iana"
  },
  "audio/dvi4": {
    source: "iana"
  },
  "audio/eac3": {
    source: "iana"
  },
  "audio/encaprtp": {
    source: "iana"
  },
  "audio/evrc": {
    source: "iana"
  },
  "audio/evrc-qcp": {
    source: "iana"
  },
  "audio/evrc0": {
    source: "iana"
  },
  "audio/evrc1": {
    source: "iana"
  },
  "audio/evrcb": {
    source: "iana"
  },
  "audio/evrcb0": {
    source: "iana"
  },
  "audio/evrcb1": {
    source: "iana"
  },
  "audio/evrcnw": {
    source: "iana"
  },
  "audio/evrcnw0": {
    source: "iana"
  },
  "audio/evrcnw1": {
    source: "iana"
  },
  "audio/evrcwb": {
    source: "iana"
  },
  "audio/evrcwb0": {
    source: "iana"
  },
  "audio/evrcwb1": {
    source: "iana"
  },
  "audio/evs": {
    source: "iana"
  },
  "audio/flexfec": {
    source: "iana"
  },
  "audio/fwdred": {
    source: "iana"
  },
  "audio/g711-0": {
    source: "iana"
  },
  "audio/g719": {
    source: "iana"
  },
  "audio/g722": {
    source: "iana"
  },
  "audio/g7221": {
    source: "iana"
  },
  "audio/g723": {
    source: "iana"
  },
  "audio/g726-16": {
    source: "iana"
  },
  "audio/g726-24": {
    source: "iana"
  },
  "audio/g726-32": {
    source: "iana"
  },
  "audio/g726-40": {
    source: "iana"
  },
  "audio/g728": {
    source: "iana"
  },
  "audio/g729": {
    source: "iana"
  },
  "audio/g7291": {
    source: "iana"
  },
  "audio/g729d": {
    source: "iana"
  },
  "audio/g729e": {
    source: "iana"
  },
  "audio/gsm": {
    source: "iana"
  },
  "audio/gsm-efr": {
    source: "iana"
  },
  "audio/gsm-hr-08": {
    source: "iana"
  },
  "audio/ilbc": {
    source: "iana"
  },
  "audio/ip-mr_v2.5": {
    source: "iana"
  },
  "audio/isac": {
    source: "apache"
  },
  "audio/l16": {
    source: "iana"
  },
  "audio/l20": {
    source: "iana"
  },
  "audio/l24": {
    source: "iana",
    compressible: !1
  },
  "audio/l8": {
    source: "iana"
  },
  "audio/lpc": {
    source: "iana"
  },
  "audio/melp": {
    source: "iana"
  },
  "audio/melp1200": {
    source: "iana"
  },
  "audio/melp2400": {
    source: "iana"
  },
  "audio/melp600": {
    source: "iana"
  },
  "audio/mhas": {
    source: "iana"
  },
  "audio/midi": {
    source: "apache",
    extensions: [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/mobile-xmf": {
    source: "iana",
    extensions: [
      "mxmf"
    ]
  },
  "audio/mp3": {
    compressible: !1,
    extensions: [
      "mp3"
    ]
  },
  "audio/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "m4a",
      "mp4a"
    ]
  },
  "audio/mp4a-latm": {
    source: "iana"
  },
  "audio/mpa": {
    source: "iana"
  },
  "audio/mpa-robust": {
    source: "iana"
  },
  "audio/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/mpeg4-generic": {
    source: "iana"
  },
  "audio/musepack": {
    source: "apache"
  },
  "audio/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/opus": {
    source: "iana"
  },
  "audio/parityfec": {
    source: "iana"
  },
  "audio/pcma": {
    source: "iana"
  },
  "audio/pcma-wb": {
    source: "iana"
  },
  "audio/pcmu": {
    source: "iana"
  },
  "audio/pcmu-wb": {
    source: "iana"
  },
  "audio/prs.sid": {
    source: "iana"
  },
  "audio/qcelp": {
    source: "iana"
  },
  "audio/raptorfec": {
    source: "iana"
  },
  "audio/red": {
    source: "iana"
  },
  "audio/rtp-enc-aescm128": {
    source: "iana"
  },
  "audio/rtp-midi": {
    source: "iana"
  },
  "audio/rtploopback": {
    source: "iana"
  },
  "audio/rtx": {
    source: "iana"
  },
  "audio/s3m": {
    source: "apache",
    extensions: [
      "s3m"
    ]
  },
  "audio/scip": {
    source: "iana"
  },
  "audio/silk": {
    source: "apache",
    extensions: [
      "sil"
    ]
  },
  "audio/smv": {
    source: "iana"
  },
  "audio/smv-qcp": {
    source: "iana"
  },
  "audio/smv0": {
    source: "iana"
  },
  "audio/sofa": {
    source: "iana"
  },
  "audio/sp-midi": {
    source: "iana"
  },
  "audio/speex": {
    source: "iana"
  },
  "audio/t140c": {
    source: "iana"
  },
  "audio/t38": {
    source: "iana"
  },
  "audio/telephone-event": {
    source: "iana"
  },
  "audio/tetra_acelp": {
    source: "iana"
  },
  "audio/tetra_acelp_bb": {
    source: "iana"
  },
  "audio/tone": {
    source: "iana"
  },
  "audio/tsvcis": {
    source: "iana"
  },
  "audio/uemclip": {
    source: "iana"
  },
  "audio/ulpfec": {
    source: "iana"
  },
  "audio/usac": {
    source: "iana"
  },
  "audio/vdvi": {
    source: "iana"
  },
  "audio/vmr-wb": {
    source: "iana"
  },
  "audio/vnd.3gpp.iufp": {
    source: "iana"
  },
  "audio/vnd.4sb": {
    source: "iana"
  },
  "audio/vnd.audiokoz": {
    source: "iana"
  },
  "audio/vnd.celp": {
    source: "iana"
  },
  "audio/vnd.cisco.nse": {
    source: "iana"
  },
  "audio/vnd.cmles.radio-events": {
    source: "iana"
  },
  "audio/vnd.cns.anp1": {
    source: "iana"
  },
  "audio/vnd.cns.inf1": {
    source: "iana"
  },
  "audio/vnd.dece.audio": {
    source: "iana",
    extensions: [
      "uva",
      "uvva"
    ]
  },
  "audio/vnd.digital-winds": {
    source: "iana",
    extensions: [
      "eol"
    ]
  },
  "audio/vnd.dlna.adts": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    source: "iana"
  },
  "audio/vnd.dolby.mlp": {
    source: "iana"
  },
  "audio/vnd.dolby.mps": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2x": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2z": {
    source: "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    source: "iana"
  },
  "audio/vnd.dra": {
    source: "iana",
    extensions: [
      "dra"
    ]
  },
  "audio/vnd.dts": {
    source: "iana",
    extensions: [
      "dts"
    ]
  },
  "audio/vnd.dts.hd": {
    source: "iana",
    extensions: [
      "dtshd"
    ]
  },
  "audio/vnd.dts.uhd": {
    source: "iana"
  },
  "audio/vnd.dvb.file": {
    source: "iana"
  },
  "audio/vnd.everad.plj": {
    source: "iana"
  },
  "audio/vnd.hns.audio": {
    source: "iana"
  },
  "audio/vnd.lucent.voice": {
    source: "iana",
    extensions: [
      "lvp"
    ]
  },
  "audio/vnd.ms-playready.media.pya": {
    source: "iana",
    extensions: [
      "pya"
    ]
  },
  "audio/vnd.nokia.mobile-xmf": {
    source: "iana"
  },
  "audio/vnd.nortel.vbk": {
    source: "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    source: "iana",
    extensions: [
      "ecelp4800"
    ]
  },
  "audio/vnd.nuera.ecelp7470": {
    source: "iana",
    extensions: [
      "ecelp7470"
    ]
  },
  "audio/vnd.nuera.ecelp9600": {
    source: "iana",
    extensions: [
      "ecelp9600"
    ]
  },
  "audio/vnd.octel.sbc": {
    source: "iana"
  },
  "audio/vnd.presonus.multitrack": {
    source: "iana"
  },
  "audio/vnd.qcelp": {
    source: "iana"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    source: "iana"
  },
  "audio/vnd.rip": {
    source: "iana",
    extensions: [
      "rip"
    ]
  },
  "audio/vnd.rn-realaudio": {
    compressible: !1
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    source: "iana"
  },
  "audio/vnd.vmx.cvsd": {
    source: "iana"
  },
  "audio/vnd.wave": {
    compressible: !1
  },
  "audio/vorbis": {
    source: "iana",
    compressible: !1
  },
  "audio/vorbis-config": {
    source: "iana"
  },
  "audio/wav": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/wave": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "weba"
    ]
  },
  "audio/x-aac": {
    source: "apache",
    compressible: !1,
    extensions: [
      "aac"
    ]
  },
  "audio/x-aiff": {
    source: "apache",
    extensions: [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    source: "apache",
    compressible: !1,
    extensions: [
      "caf"
    ]
  },
  "audio/x-flac": {
    source: "apache",
    extensions: [
      "flac"
    ]
  },
  "audio/x-m4a": {
    source: "nginx",
    extensions: [
      "m4a"
    ]
  },
  "audio/x-matroska": {
    source: "apache",
    extensions: [
      "mka"
    ]
  },
  "audio/x-mpegurl": {
    source: "apache",
    extensions: [
      "m3u"
    ]
  },
  "audio/x-ms-wax": {
    source: "apache",
    extensions: [
      "wax"
    ]
  },
  "audio/x-ms-wma": {
    source: "apache",
    extensions: [
      "wma"
    ]
  },
  "audio/x-pn-realaudio": {
    source: "apache",
    extensions: [
      "ram",
      "ra"
    ]
  },
  "audio/x-pn-realaudio-plugin": {
    source: "apache",
    extensions: [
      "rmp"
    ]
  },
  "audio/x-realaudio": {
    source: "nginx",
    extensions: [
      "ra"
    ]
  },
  "audio/x-tta": {
    source: "apache"
  },
  "audio/x-wav": {
    source: "apache",
    extensions: [
      "wav"
    ]
  },
  "audio/xm": {
    source: "apache",
    extensions: [
      "xm"
    ]
  },
  "chemical/x-cdx": {
    source: "apache",
    extensions: [
      "cdx"
    ]
  },
  "chemical/x-cif": {
    source: "apache",
    extensions: [
      "cif"
    ]
  },
  "chemical/x-cmdf": {
    source: "apache",
    extensions: [
      "cmdf"
    ]
  },
  "chemical/x-cml": {
    source: "apache",
    extensions: [
      "cml"
    ]
  },
  "chemical/x-csml": {
    source: "apache",
    extensions: [
      "csml"
    ]
  },
  "chemical/x-pdb": {
    source: "apache"
  },
  "chemical/x-xyz": {
    source: "apache",
    extensions: [
      "xyz"
    ]
  },
  "font/collection": {
    source: "iana",
    extensions: [
      "ttc"
    ]
  },
  "font/otf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "otf"
    ]
  },
  "font/sfnt": {
    source: "iana"
  },
  "font/ttf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttf"
    ]
  },
  "font/woff": {
    source: "iana",
    extensions: [
      "woff"
    ]
  },
  "font/woff2": {
    source: "iana",
    extensions: [
      "woff2"
    ]
  },
  "image/aces": {
    source: "iana",
    extensions: [
      "exr"
    ]
  },
  "image/apng": {
    compressible: !1,
    extensions: [
      "apng"
    ]
  },
  "image/avci": {
    source: "iana",
    extensions: [
      "avci"
    ]
  },
  "image/avcs": {
    source: "iana",
    extensions: [
      "avcs"
    ]
  },
  "image/avif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "avif"
    ]
  },
  "image/bmp": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/cgm": {
    source: "iana",
    extensions: [
      "cgm"
    ]
  },
  "image/dicom-rle": {
    source: "iana",
    extensions: [
      "drle"
    ]
  },
  "image/emf": {
    source: "iana",
    extensions: [
      "emf"
    ]
  },
  "image/fits": {
    source: "iana",
    extensions: [
      "fits"
    ]
  },
  "image/g3fax": {
    source: "iana",
    extensions: [
      "g3"
    ]
  },
  "image/gif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gif"
    ]
  },
  "image/heic": {
    source: "iana",
    extensions: [
      "heic"
    ]
  },
  "image/heic-sequence": {
    source: "iana",
    extensions: [
      "heics"
    ]
  },
  "image/heif": {
    source: "iana",
    extensions: [
      "heif"
    ]
  },
  "image/heif-sequence": {
    source: "iana",
    extensions: [
      "heifs"
    ]
  },
  "image/hej2k": {
    source: "iana",
    extensions: [
      "hej2"
    ]
  },
  "image/hsj2": {
    source: "iana",
    extensions: [
      "hsj2"
    ]
  },
  "image/ief": {
    source: "iana",
    extensions: [
      "ief"
    ]
  },
  "image/jls": {
    source: "iana",
    extensions: [
      "jls"
    ]
  },
  "image/jp2": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jp2",
      "jpg2"
    ]
  },
  "image/jpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpeg",
      "jpg",
      "jpe"
    ]
  },
  "image/jph": {
    source: "iana",
    extensions: [
      "jph"
    ]
  },
  "image/jphc": {
    source: "iana",
    extensions: [
      "jhc"
    ]
  },
  "image/jpm": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpm"
    ]
  },
  "image/jpx": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpx",
      "jpf"
    ]
  },
  "image/jxr": {
    source: "iana",
    extensions: [
      "jxr"
    ]
  },
  "image/jxra": {
    source: "iana",
    extensions: [
      "jxra"
    ]
  },
  "image/jxrs": {
    source: "iana",
    extensions: [
      "jxrs"
    ]
  },
  "image/jxs": {
    source: "iana",
    extensions: [
      "jxs"
    ]
  },
  "image/jxsc": {
    source: "iana",
    extensions: [
      "jxsc"
    ]
  },
  "image/jxsi": {
    source: "iana",
    extensions: [
      "jxsi"
    ]
  },
  "image/jxss": {
    source: "iana",
    extensions: [
      "jxss"
    ]
  },
  "image/ktx": {
    source: "iana",
    extensions: [
      "ktx"
    ]
  },
  "image/ktx2": {
    source: "iana",
    extensions: [
      "ktx2"
    ]
  },
  "image/naplps": {
    source: "iana"
  },
  "image/pjpeg": {
    compressible: !1
  },
  "image/png": {
    source: "iana",
    compressible: !1,
    extensions: [
      "png"
    ]
  },
  "image/prs.btif": {
    source: "iana",
    extensions: [
      "btif"
    ]
  },
  "image/prs.pti": {
    source: "iana",
    extensions: [
      "pti"
    ]
  },
  "image/pwg-raster": {
    source: "iana"
  },
  "image/sgi": {
    source: "apache",
    extensions: [
      "sgi"
    ]
  },
  "image/svg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "svg",
      "svgz"
    ]
  },
  "image/t38": {
    source: "iana",
    extensions: [
      "t38"
    ]
  },
  "image/tiff": {
    source: "iana",
    compressible: !1,
    extensions: [
      "tif",
      "tiff"
    ]
  },
  "image/tiff-fx": {
    source: "iana",
    extensions: [
      "tfx"
    ]
  },
  "image/vnd.adobe.photoshop": {
    source: "iana",
    compressible: !0,
    extensions: [
      "psd"
    ]
  },
  "image/vnd.airzip.accelerator.azv": {
    source: "iana",
    extensions: [
      "azv"
    ]
  },
  "image/vnd.cns.inf2": {
    source: "iana"
  },
  "image/vnd.dece.graphic": {
    source: "iana",
    extensions: [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    source: "iana",
    extensions: [
      "djvu",
      "djv"
    ]
  },
  "image/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "image/vnd.dwg": {
    source: "iana",
    extensions: [
      "dwg"
    ]
  },
  "image/vnd.dxf": {
    source: "iana",
    extensions: [
      "dxf"
    ]
  },
  "image/vnd.fastbidsheet": {
    source: "iana",
    extensions: [
      "fbs"
    ]
  },
  "image/vnd.fpx": {
    source: "iana",
    extensions: [
      "fpx"
    ]
  },
  "image/vnd.fst": {
    source: "iana",
    extensions: [
      "fst"
    ]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    source: "iana",
    extensions: [
      "mmr"
    ]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    source: "iana",
    extensions: [
      "rlc"
    ]
  },
  "image/vnd.globalgraphics.pgb": {
    source: "iana"
  },
  "image/vnd.microsoft.icon": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/vnd.mix": {
    source: "iana"
  },
  "image/vnd.mozilla.apng": {
    source: "iana"
  },
  "image/vnd.ms-dds": {
    compressible: !0,
    extensions: [
      "dds"
    ]
  },
  "image/vnd.ms-modi": {
    source: "iana",
    extensions: [
      "mdi"
    ]
  },
  "image/vnd.ms-photo": {
    source: "apache",
    extensions: [
      "wdp"
    ]
  },
  "image/vnd.net-fpx": {
    source: "iana",
    extensions: [
      "npx"
    ]
  },
  "image/vnd.pco.b16": {
    source: "iana",
    extensions: [
      "b16"
    ]
  },
  "image/vnd.radiance": {
    source: "iana"
  },
  "image/vnd.sealed.png": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    source: "iana"
  },
  "image/vnd.svf": {
    source: "iana"
  },
  "image/vnd.tencent.tap": {
    source: "iana",
    extensions: [
      "tap"
    ]
  },
  "image/vnd.valve.source.texture": {
    source: "iana",
    extensions: [
      "vtf"
    ]
  },
  "image/vnd.wap.wbmp": {
    source: "iana",
    extensions: [
      "wbmp"
    ]
  },
  "image/vnd.xiff": {
    source: "iana",
    extensions: [
      "xif"
    ]
  },
  "image/vnd.zbrush.pcx": {
    source: "iana",
    extensions: [
      "pcx"
    ]
  },
  "image/webp": {
    source: "apache",
    extensions: [
      "webp"
    ]
  },
  "image/wmf": {
    source: "iana",
    extensions: [
      "wmf"
    ]
  },
  "image/x-3ds": {
    source: "apache",
    extensions: [
      "3ds"
    ]
  },
  "image/x-cmu-raster": {
    source: "apache",
    extensions: [
      "ras"
    ]
  },
  "image/x-cmx": {
    source: "apache",
    extensions: [
      "cmx"
    ]
  },
  "image/x-freehand": {
    source: "apache",
    extensions: [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/x-jng": {
    source: "nginx",
    extensions: [
      "jng"
    ]
  },
  "image/x-mrsid-image": {
    source: "apache",
    extensions: [
      "sid"
    ]
  },
  "image/x-ms-bmp": {
    source: "nginx",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/x-pcx": {
    source: "apache",
    extensions: [
      "pcx"
    ]
  },
  "image/x-pict": {
    source: "apache",
    extensions: [
      "pic",
      "pct"
    ]
  },
  "image/x-portable-anymap": {
    source: "apache",
    extensions: [
      "pnm"
    ]
  },
  "image/x-portable-bitmap": {
    source: "apache",
    extensions: [
      "pbm"
    ]
  },
  "image/x-portable-graymap": {
    source: "apache",
    extensions: [
      "pgm"
    ]
  },
  "image/x-portable-pixmap": {
    source: "apache",
    extensions: [
      "ppm"
    ]
  },
  "image/x-rgb": {
    source: "apache",
    extensions: [
      "rgb"
    ]
  },
  "image/x-tga": {
    source: "apache",
    extensions: [
      "tga"
    ]
  },
  "image/x-xbitmap": {
    source: "apache",
    extensions: [
      "xbm"
    ]
  },
  "image/x-xcf": {
    compressible: !1
  },
  "image/x-xpixmap": {
    source: "apache",
    extensions: [
      "xpm"
    ]
  },
  "image/x-xwindowdump": {
    source: "apache",
    extensions: [
      "xwd"
    ]
  },
  "message/cpim": {
    source: "iana"
  },
  "message/delivery-status": {
    source: "iana"
  },
  "message/disposition-notification": {
    source: "iana",
    extensions: [
      "disposition-notification"
    ]
  },
  "message/external-body": {
    source: "iana"
  },
  "message/feedback-report": {
    source: "iana"
  },
  "message/global": {
    source: "iana",
    extensions: [
      "u8msg"
    ]
  },
  "message/global-delivery-status": {
    source: "iana",
    extensions: [
      "u8dsn"
    ]
  },
  "message/global-disposition-notification": {
    source: "iana",
    extensions: [
      "u8mdn"
    ]
  },
  "message/global-headers": {
    source: "iana",
    extensions: [
      "u8hdr"
    ]
  },
  "message/http": {
    source: "iana",
    compressible: !1
  },
  "message/imdn+xml": {
    source: "iana",
    compressible: !0
  },
  "message/news": {
    source: "iana"
  },
  "message/partial": {
    source: "iana",
    compressible: !1
  },
  "message/rfc822": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eml",
      "mime"
    ]
  },
  "message/s-http": {
    source: "iana"
  },
  "message/sip": {
    source: "iana"
  },
  "message/sipfrag": {
    source: "iana"
  },
  "message/tracking-status": {
    source: "iana"
  },
  "message/vnd.si.simp": {
    source: "iana"
  },
  "message/vnd.wfa.wsc": {
    source: "iana",
    extensions: [
      "wsc"
    ]
  },
  "model/3mf": {
    source: "iana",
    extensions: [
      "3mf"
    ]
  },
  "model/e57": {
    source: "iana"
  },
  "model/gltf+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gltf"
    ]
  },
  "model/gltf-binary": {
    source: "iana",
    compressible: !0,
    extensions: [
      "glb"
    ]
  },
  "model/iges": {
    source: "iana",
    compressible: !1,
    extensions: [
      "igs",
      "iges"
    ]
  },
  "model/mesh": {
    source: "iana",
    compressible: !1,
    extensions: [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    source: "iana",
    extensions: [
      "mtl"
    ]
  },
  "model/obj": {
    source: "iana",
    extensions: [
      "obj"
    ]
  },
  "model/step": {
    source: "iana"
  },
  "model/step+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "stpx"
    ]
  },
  "model/step+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpz"
    ]
  },
  "model/step-xml+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpxz"
    ]
  },
  "model/stl": {
    source: "iana",
    extensions: [
      "stl"
    ]
  },
  "model/vnd.collada+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dae"
    ]
  },
  "model/vnd.dwf": {
    source: "iana",
    extensions: [
      "dwf"
    ]
  },
  "model/vnd.flatland.3dml": {
    source: "iana"
  },
  "model/vnd.gdl": {
    source: "iana",
    extensions: [
      "gdl"
    ]
  },
  "model/vnd.gs-gdl": {
    source: "apache"
  },
  "model/vnd.gs.gdl": {
    source: "iana"
  },
  "model/vnd.gtw": {
    source: "iana",
    extensions: [
      "gtw"
    ]
  },
  "model/vnd.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "model/vnd.mts": {
    source: "iana",
    extensions: [
      "mts"
    ]
  },
  "model/vnd.opengex": {
    source: "iana",
    extensions: [
      "ogex"
    ]
  },
  "model/vnd.parasolid.transmit.binary": {
    source: "iana",
    extensions: [
      "x_b"
    ]
  },
  "model/vnd.parasolid.transmit.text": {
    source: "iana",
    extensions: [
      "x_t"
    ]
  },
  "model/vnd.pytha.pyox": {
    source: "iana"
  },
  "model/vnd.rosette.annotated-data-model": {
    source: "iana"
  },
  "model/vnd.sap.vds": {
    source: "iana",
    extensions: [
      "vds"
    ]
  },
  "model/vnd.usdz+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "usdz"
    ]
  },
  "model/vnd.valve.source.compiled-map": {
    source: "iana",
    extensions: [
      "bsp"
    ]
  },
  "model/vnd.vtu": {
    source: "iana",
    extensions: [
      "vtu"
    ]
  },
  "model/vrml": {
    source: "iana",
    compressible: !1,
    extensions: [
      "wrl",
      "vrml"
    ]
  },
  "model/x3d+binary": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3db",
      "x3dbz"
    ]
  },
  "model/x3d+fastinfoset": {
    source: "iana",
    extensions: [
      "x3db"
    ]
  },
  "model/x3d+vrml": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3dv",
      "x3dvz"
    ]
  },
  "model/x3d+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "x3d",
      "x3dz"
    ]
  },
  "model/x3d-vrml": {
    source: "iana",
    extensions: [
      "x3dv"
    ]
  },
  "multipart/alternative": {
    source: "iana",
    compressible: !1
  },
  "multipart/appledouble": {
    source: "iana"
  },
  "multipart/byteranges": {
    source: "iana"
  },
  "multipart/digest": {
    source: "iana"
  },
  "multipart/encrypted": {
    source: "iana",
    compressible: !1
  },
  "multipart/form-data": {
    source: "iana",
    compressible: !1
  },
  "multipart/header-set": {
    source: "iana"
  },
  "multipart/mixed": {
    source: "iana"
  },
  "multipart/multilingual": {
    source: "iana"
  },
  "multipart/parallel": {
    source: "iana"
  },
  "multipart/related": {
    source: "iana",
    compressible: !1
  },
  "multipart/report": {
    source: "iana"
  },
  "multipart/signed": {
    source: "iana",
    compressible: !1
  },
  "multipart/vnd.bint.med-plus": {
    source: "iana"
  },
  "multipart/voice-message": {
    source: "iana"
  },
  "multipart/x-mixed-replace": {
    source: "iana"
  },
  "text/1d-interleaved-parityfec": {
    source: "iana"
  },
  "text/cache-manifest": {
    source: "iana",
    compressible: !0,
    extensions: [
      "appcache",
      "manifest"
    ]
  },
  "text/calendar": {
    source: "iana",
    extensions: [
      "ics",
      "ifb"
    ]
  },
  "text/calender": {
    compressible: !0
  },
  "text/cmd": {
    compressible: !0
  },
  "text/coffeescript": {
    extensions: [
      "coffee",
      "litcoffee"
    ]
  },
  "text/cql": {
    source: "iana"
  },
  "text/cql-expression": {
    source: "iana"
  },
  "text/cql-identifier": {
    source: "iana"
  },
  "text/css": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "css"
    ]
  },
  "text/csv": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csv"
    ]
  },
  "text/csv-schema": {
    source: "iana"
  },
  "text/directory": {
    source: "iana"
  },
  "text/dns": {
    source: "iana"
  },
  "text/ecmascript": {
    source: "iana"
  },
  "text/encaprtp": {
    source: "iana"
  },
  "text/enriched": {
    source: "iana"
  },
  "text/fhirpath": {
    source: "iana"
  },
  "text/flexfec": {
    source: "iana"
  },
  "text/fwdred": {
    source: "iana"
  },
  "text/gff3": {
    source: "iana"
  },
  "text/grammar-ref-list": {
    source: "iana"
  },
  "text/html": {
    source: "iana",
    compressible: !0,
    extensions: [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/jade": {
    extensions: [
      "jade"
    ]
  },
  "text/javascript": {
    source: "iana",
    compressible: !0
  },
  "text/jcr-cnd": {
    source: "iana"
  },
  "text/jsx": {
    compressible: !0,
    extensions: [
      "jsx"
    ]
  },
  "text/less": {
    compressible: !0,
    extensions: [
      "less"
    ]
  },
  "text/markdown": {
    source: "iana",
    compressible: !0,
    extensions: [
      "markdown",
      "md"
    ]
  },
  "text/mathml": {
    source: "nginx",
    extensions: [
      "mml"
    ]
  },
  "text/mdx": {
    compressible: !0,
    extensions: [
      "mdx"
    ]
  },
  "text/mizar": {
    source: "iana"
  },
  "text/n3": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "n3"
    ]
  },
  "text/parameters": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/parityfec": {
    source: "iana"
  },
  "text/plain": {
    source: "iana",
    compressible: !0,
    extensions: [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/provenance-notation": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/prs.fallenstein.rst": {
    source: "iana"
  },
  "text/prs.lines.tag": {
    source: "iana",
    extensions: [
      "dsc"
    ]
  },
  "text/prs.prop.logic": {
    source: "iana"
  },
  "text/raptorfec": {
    source: "iana"
  },
  "text/red": {
    source: "iana"
  },
  "text/rfc822-headers": {
    source: "iana"
  },
  "text/richtext": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtx"
    ]
  },
  "text/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "text/rtp-enc-aescm128": {
    source: "iana"
  },
  "text/rtploopback": {
    source: "iana"
  },
  "text/rtx": {
    source: "iana"
  },
  "text/sgml": {
    source: "iana",
    extensions: [
      "sgml",
      "sgm"
    ]
  },
  "text/shaclc": {
    source: "iana"
  },
  "text/shex": {
    source: "iana",
    extensions: [
      "shex"
    ]
  },
  "text/slim": {
    extensions: [
      "slim",
      "slm"
    ]
  },
  "text/spdx": {
    source: "iana",
    extensions: [
      "spdx"
    ]
  },
  "text/strings": {
    source: "iana"
  },
  "text/stylus": {
    extensions: [
      "stylus",
      "styl"
    ]
  },
  "text/t140": {
    source: "iana"
  },
  "text/tab-separated-values": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tsv"
    ]
  },
  "text/troff": {
    source: "iana",
    extensions: [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "ttl"
    ]
  },
  "text/ulpfec": {
    source: "iana"
  },
  "text/uri-list": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vcard"
    ]
  },
  "text/vnd.a": {
    source: "iana"
  },
  "text/vnd.abc": {
    source: "iana"
  },
  "text/vnd.ascii-art": {
    source: "iana"
  },
  "text/vnd.curl": {
    source: "iana",
    extensions: [
      "curl"
    ]
  },
  "text/vnd.curl.dcurl": {
    source: "apache",
    extensions: [
      "dcurl"
    ]
  },
  "text/vnd.curl.mcurl": {
    source: "apache",
    extensions: [
      "mcurl"
    ]
  },
  "text/vnd.curl.scurl": {
    source: "apache",
    extensions: [
      "scurl"
    ]
  },
  "text/vnd.debian.copyright": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.dmclientscript": {
    source: "iana"
  },
  "text/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "text/vnd.esmertec.theme-descriptor": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.familysearch.gedcom": {
    source: "iana",
    extensions: [
      "ged"
    ]
  },
  "text/vnd.ficlab.flt": {
    source: "iana"
  },
  "text/vnd.fly": {
    source: "iana",
    extensions: [
      "fly"
    ]
  },
  "text/vnd.fmi.flexstor": {
    source: "iana",
    extensions: [
      "flx"
    ]
  },
  "text/vnd.gml": {
    source: "iana"
  },
  "text/vnd.graphviz": {
    source: "iana",
    extensions: [
      "gv"
    ]
  },
  "text/vnd.hans": {
    source: "iana"
  },
  "text/vnd.hgl": {
    source: "iana"
  },
  "text/vnd.in3d.3dml": {
    source: "iana",
    extensions: [
      "3dml"
    ]
  },
  "text/vnd.in3d.spot": {
    source: "iana",
    extensions: [
      "spot"
    ]
  },
  "text/vnd.iptc.newsml": {
    source: "iana"
  },
  "text/vnd.iptc.nitf": {
    source: "iana"
  },
  "text/vnd.latex-z": {
    source: "iana"
  },
  "text/vnd.motorola.reflex": {
    source: "iana"
  },
  "text/vnd.ms-mediapackage": {
    source: "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    source: "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    source: "iana"
  },
  "text/vnd.senx.warpscript": {
    source: "iana"
  },
  "text/vnd.si.uricatalogue": {
    source: "iana"
  },
  "text/vnd.sosi": {
    source: "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "jad"
    ]
  },
  "text/vnd.trolltech.linguist": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.wap.si": {
    source: "iana"
  },
  "text/vnd.wap.sl": {
    source: "iana"
  },
  "text/vnd.wap.wml": {
    source: "iana",
    extensions: [
      "wml"
    ]
  },
  "text/vnd.wap.wmlscript": {
    source: "iana",
    extensions: [
      "wmls"
    ]
  },
  "text/vtt": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "vtt"
    ]
  },
  "text/x-asm": {
    source: "apache",
    extensions: [
      "s",
      "asm"
    ]
  },
  "text/x-c": {
    source: "apache",
    extensions: [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    source: "nginx",
    extensions: [
      "htc"
    ]
  },
  "text/x-fortran": {
    source: "apache",
    extensions: [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-gwt-rpc": {
    compressible: !0
  },
  "text/x-handlebars-template": {
    extensions: [
      "hbs"
    ]
  },
  "text/x-java-source": {
    source: "apache",
    extensions: [
      "java"
    ]
  },
  "text/x-jquery-tmpl": {
    compressible: !0
  },
  "text/x-lua": {
    extensions: [
      "lua"
    ]
  },
  "text/x-markdown": {
    compressible: !0,
    extensions: [
      "mkd"
    ]
  },
  "text/x-nfo": {
    source: "apache",
    extensions: [
      "nfo"
    ]
  },
  "text/x-opml": {
    source: "apache",
    extensions: [
      "opml"
    ]
  },
  "text/x-org": {
    compressible: !0,
    extensions: [
      "org"
    ]
  },
  "text/x-pascal": {
    source: "apache",
    extensions: [
      "p",
      "pas"
    ]
  },
  "text/x-processing": {
    compressible: !0,
    extensions: [
      "pde"
    ]
  },
  "text/x-sass": {
    extensions: [
      "sass"
    ]
  },
  "text/x-scss": {
    extensions: [
      "scss"
    ]
  },
  "text/x-setext": {
    source: "apache",
    extensions: [
      "etx"
    ]
  },
  "text/x-sfv": {
    source: "apache",
    extensions: [
      "sfv"
    ]
  },
  "text/x-suse-ymp": {
    compressible: !0,
    extensions: [
      "ymp"
    ]
  },
  "text/x-uuencode": {
    source: "apache",
    extensions: [
      "uu"
    ]
  },
  "text/x-vcalendar": {
    source: "apache",
    extensions: [
      "vcs"
    ]
  },
  "text/x-vcard": {
    source: "apache",
    extensions: [
      "vcf"
    ]
  },
  "text/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml"
    ]
  },
  "text/xml-external-parsed-entity": {
    source: "iana"
  },
  "text/yaml": {
    compressible: !0,
    extensions: [
      "yaml",
      "yml"
    ]
  },
  "video/1d-interleaved-parityfec": {
    source: "iana"
  },
  "video/3gpp": {
    source: "iana",
    extensions: [
      "3gp",
      "3gpp"
    ]
  },
  "video/3gpp-tt": {
    source: "iana"
  },
  "video/3gpp2": {
    source: "iana",
    extensions: [
      "3g2"
    ]
  },
  "video/av1": {
    source: "iana"
  },
  "video/bmpeg": {
    source: "iana"
  },
  "video/bt656": {
    source: "iana"
  },
  "video/celb": {
    source: "iana"
  },
  "video/dv": {
    source: "iana"
  },
  "video/encaprtp": {
    source: "iana"
  },
  "video/ffv1": {
    source: "iana"
  },
  "video/flexfec": {
    source: "iana"
  },
  "video/h261": {
    source: "iana",
    extensions: [
      "h261"
    ]
  },
  "video/h263": {
    source: "iana",
    extensions: [
      "h263"
    ]
  },
  "video/h263-1998": {
    source: "iana"
  },
  "video/h263-2000": {
    source: "iana"
  },
  "video/h264": {
    source: "iana",
    extensions: [
      "h264"
    ]
  },
  "video/h264-rcdo": {
    source: "iana"
  },
  "video/h264-svc": {
    source: "iana"
  },
  "video/h265": {
    source: "iana"
  },
  "video/iso.segment": {
    source: "iana",
    extensions: [
      "m4s"
    ]
  },
  "video/jpeg": {
    source: "iana",
    extensions: [
      "jpgv"
    ]
  },
  "video/jpeg2000": {
    source: "iana"
  },
  "video/jpm": {
    source: "apache",
    extensions: [
      "jpm",
      "jpgm"
    ]
  },
  "video/jxsv": {
    source: "iana"
  },
  "video/mj2": {
    source: "iana",
    extensions: [
      "mj2",
      "mjp2"
    ]
  },
  "video/mp1s": {
    source: "iana"
  },
  "video/mp2p": {
    source: "iana"
  },
  "video/mp2t": {
    source: "iana",
    extensions: [
      "ts"
    ]
  },
  "video/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mp4v-es": {
    source: "iana"
  },
  "video/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/mpeg4-generic": {
    source: "iana"
  },
  "video/mpv": {
    source: "iana"
  },
  "video/nv": {
    source: "iana"
  },
  "video/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogv"
    ]
  },
  "video/parityfec": {
    source: "iana"
  },
  "video/pointer": {
    source: "iana"
  },
  "video/quicktime": {
    source: "iana",
    compressible: !1,
    extensions: [
      "qt",
      "mov"
    ]
  },
  "video/raptorfec": {
    source: "iana"
  },
  "video/raw": {
    source: "iana"
  },
  "video/rtp-enc-aescm128": {
    source: "iana"
  },
  "video/rtploopback": {
    source: "iana"
  },
  "video/rtx": {
    source: "iana"
  },
  "video/scip": {
    source: "iana"
  },
  "video/smpte291": {
    source: "iana"
  },
  "video/smpte292m": {
    source: "iana"
  },
  "video/ulpfec": {
    source: "iana"
  },
  "video/vc1": {
    source: "iana"
  },
  "video/vc2": {
    source: "iana"
  },
  "video/vnd.cctv": {
    source: "iana"
  },
  "video/vnd.dece.hd": {
    source: "iana",
    extensions: [
      "uvh",
      "uvvh"
    ]
  },
  "video/vnd.dece.mobile": {
    source: "iana",
    extensions: [
      "uvm",
      "uvvm"
    ]
  },
  "video/vnd.dece.mp4": {
    source: "iana"
  },
  "video/vnd.dece.pd": {
    source: "iana",
    extensions: [
      "uvp",
      "uvvp"
    ]
  },
  "video/vnd.dece.sd": {
    source: "iana",
    extensions: [
      "uvs",
      "uvvs"
    ]
  },
  "video/vnd.dece.video": {
    source: "iana",
    extensions: [
      "uvv",
      "uvvv"
    ]
  },
  "video/vnd.directv.mpeg": {
    source: "iana"
  },
  "video/vnd.directv.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dlna.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dvb.file": {
    source: "iana",
    extensions: [
      "dvb"
    ]
  },
  "video/vnd.fvt": {
    source: "iana",
    extensions: [
      "fvt"
    ]
  },
  "video/vnd.hns.video": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsavc": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    source: "iana"
  },
  "video/vnd.motorola.video": {
    source: "iana"
  },
  "video/vnd.motorola.videop": {
    source: "iana"
  },
  "video/vnd.mpegurl": {
    source: "iana",
    extensions: [
      "mxu",
      "m4u"
    ]
  },
  "video/vnd.ms-playready.media.pyv": {
    source: "iana",
    extensions: [
      "pyv"
    ]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    source: "iana"
  },
  "video/vnd.nokia.mp4vr": {
    source: "iana"
  },
  "video/vnd.nokia.videovoip": {
    source: "iana"
  },
  "video/vnd.objectvideo": {
    source: "iana"
  },
  "video/vnd.radgamettools.bink": {
    source: "iana"
  },
  "video/vnd.radgamettools.smacker": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg1": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg4": {
    source: "iana"
  },
  "video/vnd.sealed.swf": {
    source: "iana"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    source: "iana"
  },
  "video/vnd.uvvu.mp4": {
    source: "iana",
    extensions: [
      "uvu",
      "uvvu"
    ]
  },
  "video/vnd.vivo": {
    source: "iana",
    extensions: [
      "viv"
    ]
  },
  "video/vnd.youtube.yt": {
    source: "iana"
  },
  "video/vp8": {
    source: "iana"
  },
  "video/vp9": {
    source: "iana"
  },
  "video/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "webm"
    ]
  },
  "video/x-f4v": {
    source: "apache",
    extensions: [
      "f4v"
    ]
  },
  "video/x-fli": {
    source: "apache",
    extensions: [
      "fli"
    ]
  },
  "video/x-flv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "flv"
    ]
  },
  "video/x-m4v": {
    source: "apache",
    extensions: [
      "m4v"
    ]
  },
  "video/x-matroska": {
    source: "apache",
    compressible: !1,
    extensions: [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    source: "apache",
    extensions: [
      "mng"
    ]
  },
  "video/x-ms-asf": {
    source: "apache",
    extensions: [
      "asf",
      "asx"
    ]
  },
  "video/x-ms-vob": {
    source: "apache",
    extensions: [
      "vob"
    ]
  },
  "video/x-ms-wm": {
    source: "apache",
    extensions: [
      "wm"
    ]
  },
  "video/x-ms-wmv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "wmv"
    ]
  },
  "video/x-ms-wmx": {
    source: "apache",
    extensions: [
      "wmx"
    ]
  },
  "video/x-ms-wvx": {
    source: "apache",
    extensions: [
      "wvx"
    ]
  },
  "video/x-msvideo": {
    source: "apache",
    extensions: [
      "avi"
    ]
  },
  "video/x-sgi-movie": {
    source: "apache",
    extensions: [
      "movie"
    ]
  },
  "video/x-smv": {
    source: "apache",
    extensions: [
      "smv"
    ]
  },
  "x-conference/x-cooltalk": {
    source: "apache",
    extensions: [
      "ice"
    ]
  },
  "x-shader/x-fragment": {
    compressible: !0
  },
  "x-shader/x-vertex": {
    compressible: !0
  }
};
/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2022 Douglas Christopher Wilson
 * MIT Licensed
 */
var Ds = $s;
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(a) {
  var e = Ds, n = Tt.extname, t = /^\s*([^;\s]*)(?:;|\s|$)/, i = /^text\//i;
  a.charset = s, a.charsets = { lookup: s }, a.contentType = o, a.extension = r, a.extensions = /* @__PURE__ */ Object.create(null), a.lookup = p, a.types = /* @__PURE__ */ Object.create(null), d(a.extensions, a.types);
  function s(c) {
    if (!c || typeof c != "string")
      return !1;
    var l = t.exec(c), u = l && e[l[1].toLowerCase()];
    return u && u.charset ? u.charset : l && i.test(l[1]) ? "UTF-8" : !1;
  }
  function o(c) {
    if (!c || typeof c != "string")
      return !1;
    var l = c.indexOf("/") === -1 ? a.lookup(c) : c;
    if (!l)
      return !1;
    if (l.indexOf("charset") === -1) {
      var u = a.charset(l);
      u && (l += "; charset=" + u.toLowerCase());
    }
    return l;
  }
  function r(c) {
    if (!c || typeof c != "string")
      return !1;
    var l = t.exec(c), u = l && a.extensions[l[1].toLowerCase()];
    return !u || !u.length ? !1 : u[0];
  }
  function p(c) {
    if (!c || typeof c != "string")
      return !1;
    var l = n("x." + c).toLowerCase().substr(1);
    return l && a.types[l] || !1;
  }
  function d(c, l) {
    var u = ["nginx", "apache", void 0, "iana"];
    Object.keys(e).forEach(function(f) {
      var v = e[f], h = v.extensions;
      if (!(!h || !h.length)) {
        c[f] = h;
        for (var b = 0; b < h.length; b++) {
          var w = h[b];
          if (l[w]) {
            var k = u.indexOf(e[l[w]].source), T = u.indexOf(v.source);
            if (l[w] !== "application/octet-stream" && (k > T || k === T && l[w].substr(0, 12) === "application/"))
              continue;
          }
          l[w] = f;
        }
      }
    });
  }
})(Vt);
var Ms = Hs;
function Hs(a) {
  var e = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
  e ? e(a) : setTimeout(a, 0);
}
var Un = Ms, Jt = Gs;
function Gs(a) {
  var e = !1;
  return Un(function() {
    e = !0;
  }), function(t, i) {
    e ? a(t, i) : Un(function() {
      a(t, i);
    });
  };
}
var Kt = Ws;
function Ws(a) {
  Object.keys(a.jobs).forEach(Vs.bind(a)), a.jobs = {};
}
function Vs(a) {
  typeof this.jobs[a] == "function" && this.jobs[a]();
}
var qn = Jt, Js = Kt, Xt = Ks;
function Ks(a, e, n, t) {
  var i = n.keyedList ? n.keyedList[n.index] : n.index;
  n.jobs[i] = Xs(e, i, a[i], function(s, o) {
    i in n.jobs && (delete n.jobs[i], s ? Js(n) : n.results[i] = o, t(s, n.results));
  });
}
function Xs(a, e, n, t) {
  var i;
  return a.length == 2 ? i = a(n, qn(t)) : i = a(n, e, qn(t)), i;
}
var Yt = Ys;
function Ys(a, e) {
  var n = !Array.isArray(a), t = {
    index: 0,
    keyedList: n || e ? Object.keys(a) : null,
    jobs: {},
    results: n ? {} : [],
    size: n ? Object.keys(a).length : a.length
  };
  return e && t.keyedList.sort(n ? e : function(i, s) {
    return e(a[i], a[s]);
  }), t;
}
var Zs = Kt, Qs = Jt, Zt = eo;
function eo(a) {
  Object.keys(this.jobs).length && (this.index = this.size, Zs(this), Qs(a)(null, this.results));
}
var ao = Xt, no = Yt, to = Zt, io = so;
function so(a, e, n) {
  for (var t = no(a); t.index < (t.keyedList || a).length; )
    ao(a, e, t, function(i, s) {
      if (i) {
        n(i, s);
        return;
      }
      if (Object.keys(t.jobs).length === 0) {
        n(null, t.results);
        return;
      }
    }), t.index++;
  return to.bind(t, n);
}
var va = { exports: {} }, Ln = Xt, oo = Yt, ro = Zt;
va.exports = co;
va.exports.ascending = Qt;
va.exports.descending = po;
function co(a, e, n, t) {
  var i = oo(a, n);
  return Ln(a, e, i, function s(o, r) {
    if (o) {
      t(o, r);
      return;
    }
    if (i.index++, i.index < (i.keyedList || a).length) {
      Ln(a, e, i, s);
      return;
    }
    t(null, i.results);
  }), ro.bind(i, t);
}
function Qt(a, e) {
  return a < e ? -1 : a > e ? 1 : 0;
}
function po(a, e) {
  return -1 * Qt(a, e);
}
var ei = va.exports, lo = ei, uo = mo;
function mo(a, e, n) {
  return lo(a, e, null, n);
}
var fo = {
  parallel: io,
  serial: uo,
  serialOrdered: ei
}, ai = Object, xo = Error, ho = EvalError, vo = RangeError, bo = ReferenceError, go = SyntaxError, Sa, Bn;
function un() {
  return Bn || (Bn = 1, Sa = TypeError), Sa;
}
var yo = URIError, wo = Math.abs, _o = Math.floor, ko = Math.max, So = Math.min, Co = Math.pow, Eo = Math.round, Ro = Number.isNaN || function(e) {
  return e !== e;
}, Ao = Ro, jo = function(e) {
  return Ao(e) || e === 0 ? e : e < 0 ? -1 : 1;
}, To = Object.getOwnPropertyDescriptor, ta = To;
if (ta)
  try {
    ta([], "length");
  } catch {
    ta = null;
  }
var ni = ta, ia = Object.defineProperty || !1;
if (ia)
  try {
    ia({}, "a", { value: 1 });
  } catch {
    ia = !1;
  }
var Oo = ia, Ca, Nn;
function ti() {
  return Nn || (Nn = 1, Ca = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var e = {}, n = Symbol("test"), t = Object(n);
    if (typeof n == "string" || Object.prototype.toString.call(n) !== "[object Symbol]" || Object.prototype.toString.call(t) !== "[object Symbol]")
      return !1;
    var i = 42;
    e[n] = i;
    for (var s in e)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(e).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(e).length !== 0)
      return !1;
    var o = Object.getOwnPropertySymbols(e);
    if (o.length !== 1 || o[0] !== n || !Object.prototype.propertyIsEnumerable.call(e, n))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var r = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(e, n)
      );
      if (r.value !== i || r.enumerable !== !0)
        return !1;
    }
    return !0;
  }), Ca;
}
var Ea, zn;
function Po() {
  if (zn) return Ea;
  zn = 1;
  var a = typeof Symbol < "u" && Symbol, e = ti();
  return Ea = function() {
    return typeof a != "function" || typeof Symbol != "function" || typeof a("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : e();
  }, Ea;
}
var Ra, In;
function ii() {
  return In || (In = 1, Ra = typeof Reflect < "u" && Reflect.getPrototypeOf || null), Ra;
}
var Aa, $n;
function si() {
  if ($n) return Aa;
  $n = 1;
  var a = ai;
  return Aa = a.getPrototypeOf || null, Aa;
}
var Fo = "Function.prototype.bind called on incompatible ", Uo = Object.prototype.toString, qo = Math.max, Lo = "[object Function]", Dn = function(e, n) {
  for (var t = [], i = 0; i < e.length; i += 1)
    t[i] = e[i];
  for (var s = 0; s < n.length; s += 1)
    t[s + e.length] = n[s];
  return t;
}, Bo = function(e, n) {
  for (var t = [], i = n, s = 0; i < e.length; i += 1, s += 1)
    t[s] = e[i];
  return t;
}, No = function(a, e) {
  for (var n = "", t = 0; t < a.length; t += 1)
    n += a[t], t + 1 < a.length && (n += e);
  return n;
}, zo = function(e) {
  var n = this;
  if (typeof n != "function" || Uo.apply(n) !== Lo)
    throw new TypeError(Fo + n);
  for (var t = Bo(arguments, 1), i, s = function() {
    if (this instanceof i) {
      var c = n.apply(
        this,
        Dn(t, arguments)
      );
      return Object(c) === c ? c : this;
    }
    return n.apply(
      e,
      Dn(t, arguments)
    );
  }, o = qo(0, n.length - t.length), r = [], p = 0; p < o; p++)
    r[p] = "$" + p;
  if (i = Function("binder", "return function (" + No(r, ",") + "){ return binder.apply(this,arguments); }")(s), n.prototype) {
    var d = function() {
    };
    d.prototype = n.prototype, i.prototype = new d(), d.prototype = null;
  }
  return i;
}, Io = zo, ba = Function.prototype.bind || Io, ja, Mn;
function dn() {
  return Mn || (Mn = 1, ja = Function.prototype.call), ja;
}
var Ta, Hn;
function oi() {
  return Hn || (Hn = 1, Ta = Function.prototype.apply), Ta;
}
var Oa, Gn;
function $o() {
  return Gn || (Gn = 1, Oa = typeof Reflect < "u" && Reflect && Reflect.apply), Oa;
}
var Pa, Wn;
function Do() {
  if (Wn) return Pa;
  Wn = 1;
  var a = ba, e = oi(), n = dn(), t = $o();
  return Pa = t || a.call(n, e), Pa;
}
var Fa, Vn;
function Mo() {
  if (Vn) return Fa;
  Vn = 1;
  var a = ba, e = un(), n = dn(), t = Do();
  return Fa = function(s) {
    if (s.length < 1 || typeof s[0] != "function")
      throw new e("a function is required");
    return t(a, n, s);
  }, Fa;
}
var Ua, Jn;
function Ho() {
  if (Jn) return Ua;
  Jn = 1;
  var a = Mo(), e = ni, n;
  try {
    n = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (o) {
    if (!o || typeof o != "object" || !("code" in o) || o.code !== "ERR_PROTO_ACCESS")
      throw o;
  }
  var t = !!n && e && e(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), i = Object, s = i.getPrototypeOf;
  return Ua = t && typeof t.get == "function" ? a([t.get]) : typeof s == "function" ? (
    /** @type {import('./get')} */
    function(r) {
      return s(r == null ? r : i(r));
    }
  ) : !1, Ua;
}
var qa, Kn;
function Go() {
  if (Kn) return qa;
  Kn = 1;
  var a = ii(), e = si(), n = Ho();
  return qa = a ? function(i) {
    return a(i);
  } : e ? function(i) {
    if (!i || typeof i != "object" && typeof i != "function")
      throw new TypeError("getProto: not an object");
    return e(i);
  } : n ? function(i) {
    return n(i);
  } : null, qa;
}
var Wo = Function.prototype.call, Vo = Object.prototype.hasOwnProperty, Jo = ba, mn = Jo.call(Wo, Vo), R, Ko = ai, Xo = xo, Yo = ho, Zo = vo, Qo = bo, Pe = go, Te = un(), er = yo, ar = wo, nr = _o, tr = ko, ir = So, sr = Co, or = Eo, rr = jo, ri = Function, La = function(a) {
  try {
    return ri('"use strict"; return (' + a + ").constructor;")();
  } catch {
  }
}, Ne = ni, cr = Oo, Ba = function() {
  throw new Te();
}, pr = Ne ? function() {
  try {
    return arguments.callee, Ba;
  } catch {
    try {
      return Ne(arguments, "callee").get;
    } catch {
      return Ba;
    }
  }
}() : Ba, Ee = Po()(), z = Go(), lr = si(), ur = ii(), ci = oi(), He = dn(), Re = {}, dr = typeof Uint8Array > "u" || !z ? R : z(Uint8Array), ge = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError > "u" ? R : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer > "u" ? R : ArrayBuffer,
  "%ArrayIteratorPrototype%": Ee && z ? z([][Symbol.iterator]()) : R,
  "%AsyncFromSyncIteratorPrototype%": R,
  "%AsyncFunction%": Re,
  "%AsyncGenerator%": Re,
  "%AsyncGeneratorFunction%": Re,
  "%AsyncIteratorPrototype%": Re,
  "%Atomics%": typeof Atomics > "u" ? R : Atomics,
  "%BigInt%": typeof BigInt > "u" ? R : BigInt,
  "%BigInt64Array%": typeof BigInt64Array > "u" ? R : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array > "u" ? R : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView > "u" ? R : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": Xo,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": Yo,
  "%Float16Array%": typeof Float16Array > "u" ? R : Float16Array,
  "%Float32Array%": typeof Float32Array > "u" ? R : Float32Array,
  "%Float64Array%": typeof Float64Array > "u" ? R : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? R : FinalizationRegistry,
  "%Function%": ri,
  "%GeneratorFunction%": Re,
  "%Int8Array%": typeof Int8Array > "u" ? R : Int8Array,
  "%Int16Array%": typeof Int16Array > "u" ? R : Int16Array,
  "%Int32Array%": typeof Int32Array > "u" ? R : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": Ee && z ? z(z([][Symbol.iterator]())) : R,
  "%JSON%": typeof JSON == "object" ? JSON : R,
  "%Map%": typeof Map > "u" ? R : Map,
  "%MapIteratorPrototype%": typeof Map > "u" || !Ee || !z ? R : z((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": Ko,
  "%Object.getOwnPropertyDescriptor%": Ne,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise > "u" ? R : Promise,
  "%Proxy%": typeof Proxy > "u" ? R : Proxy,
  "%RangeError%": Zo,
  "%ReferenceError%": Qo,
  "%Reflect%": typeof Reflect > "u" ? R : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set > "u" ? R : Set,
  "%SetIteratorPrototype%": typeof Set > "u" || !Ee || !z ? R : z((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? R : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": Ee && z ? z(""[Symbol.iterator]()) : R,
  "%Symbol%": Ee ? Symbol : R,
  "%SyntaxError%": Pe,
  "%ThrowTypeError%": pr,
  "%TypedArray%": dr,
  "%TypeError%": Te,
  "%Uint8Array%": typeof Uint8Array > "u" ? R : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? R : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array > "u" ? R : Uint16Array,
  "%Uint32Array%": typeof Uint32Array > "u" ? R : Uint32Array,
  "%URIError%": er,
  "%WeakMap%": typeof WeakMap > "u" ? R : WeakMap,
  "%WeakRef%": typeof WeakRef > "u" ? R : WeakRef,
  "%WeakSet%": typeof WeakSet > "u" ? R : WeakSet,
  "%Function.prototype.call%": He,
  "%Function.prototype.apply%": ci,
  "%Object.defineProperty%": cr,
  "%Object.getPrototypeOf%": lr,
  "%Math.abs%": ar,
  "%Math.floor%": nr,
  "%Math.max%": tr,
  "%Math.min%": ir,
  "%Math.pow%": sr,
  "%Math.round%": or,
  "%Math.sign%": rr,
  "%Reflect.getPrototypeOf%": ur
};
if (z)
  try {
    null.error;
  } catch (a) {
    var mr = z(z(a));
    ge["%Error.prototype%"] = mr;
  }
var fr = function a(e) {
  var n;
  if (e === "%AsyncFunction%")
    n = La("async function () {}");
  else if (e === "%GeneratorFunction%")
    n = La("function* () {}");
  else if (e === "%AsyncGeneratorFunction%")
    n = La("async function* () {}");
  else if (e === "%AsyncGenerator%") {
    var t = a("%AsyncGeneratorFunction%");
    t && (n = t.prototype);
  } else if (e === "%AsyncIteratorPrototype%") {
    var i = a("%AsyncGenerator%");
    i && z && (n = z(i.prototype));
  }
  return ge[e] = n, n;
}, Xn = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
}, Ge = ba, ra = mn, xr = Ge.call(He, Array.prototype.concat), hr = Ge.call(ci, Array.prototype.splice), Yn = Ge.call(He, String.prototype.replace), ca = Ge.call(He, String.prototype.slice), vr = Ge.call(He, RegExp.prototype.exec), br = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, gr = /\\(\\)?/g, yr = function(e) {
  var n = ca(e, 0, 1), t = ca(e, -1);
  if (n === "%" && t !== "%")
    throw new Pe("invalid intrinsic syntax, expected closing `%`");
  if (t === "%" && n !== "%")
    throw new Pe("invalid intrinsic syntax, expected opening `%`");
  var i = [];
  return Yn(e, br, function(s, o, r, p) {
    i[i.length] = r ? Yn(p, gr, "$1") : o || s;
  }), i;
}, wr = function(e, n) {
  var t = e, i;
  if (ra(Xn, t) && (i = Xn[t], t = "%" + i[0] + "%"), ra(ge, t)) {
    var s = ge[t];
    if (s === Re && (s = fr(t)), typeof s > "u" && !n)
      throw new Te("intrinsic " + e + " exists, but is not available. Please file an issue!");
    return {
      alias: i,
      name: t,
      value: s
    };
  }
  throw new Pe("intrinsic " + e + " does not exist!");
}, _r = function(e, n) {
  if (typeof e != "string" || e.length === 0)
    throw new Te("intrinsic name must be a non-empty string");
  if (arguments.length > 1 && typeof n != "boolean")
    throw new Te('"allowMissing" argument must be a boolean');
  if (vr(/^%?[^%]*%?$/, e) === null)
    throw new Pe("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  var t = yr(e), i = t.length > 0 ? t[0] : "", s = wr("%" + i + "%", n), o = s.name, r = s.value, p = !1, d = s.alias;
  d && (i = d[0], hr(t, xr([0, 1], d)));
  for (var c = 1, l = !0; c < t.length; c += 1) {
    var u = t[c], x = ca(u, 0, 1), f = ca(u, -1);
    if ((x === '"' || x === "'" || x === "`" || f === '"' || f === "'" || f === "`") && x !== f)
      throw new Pe("property names with quotes must have matching quotes");
    if ((u === "constructor" || !l) && (p = !0), i += "." + u, o = "%" + i + "%", ra(ge, o))
      r = ge[o];
    else if (r != null) {
      if (!(u in r)) {
        if (!n)
          throw new Te("base intrinsic for " + e + " exists, but the property is not available.");
        return;
      }
      if (Ne && c + 1 >= t.length) {
        var v = Ne(r, u);
        l = !!v, l && "get" in v && !("originalValue" in v.get) ? r = v.get : r = r[u];
      } else
        l = ra(r, u), r = r[u];
      l && !p && (ge[o] = r);
    }
  }
  return r;
}, Na, Zn;
function kr() {
  if (Zn) return Na;
  Zn = 1;
  var a = ti();
  return Na = function() {
    return a() && !!Symbol.toStringTag;
  }, Na;
}
var Sr = _r, Qn = Sr("%Object.defineProperty%", !0), Cr = kr()(), Er = mn, Rr = un(), Xe = Cr ? Symbol.toStringTag : null, Ar = function(e, n) {
  var t = arguments.length > 2 && !!arguments[2] && arguments[2].force, i = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
  if (typeof t < "u" && typeof t != "boolean" || typeof i < "u" && typeof i != "boolean")
    throw new Rr("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
  Xe && (t || !Er(e, Xe)) && (Qn ? Qn(e, Xe, {
    configurable: !i,
    enumerable: !1,
    value: n,
    writable: !1
  }) : e[Xe] = n);
}, jr = function(a, e) {
  return Object.keys(e).forEach(function(n) {
    a[n] = a[n] || e[n];
  }), a;
}, fn = Is, Tr = Se, za = Tt, Or = cn, Pr = pn, Fr = ma.parse, Ur = Wi, qr = W.Stream, Lr = Ot, Ia = Vt, Br = fo, Nr = Ar, de = mn, Qa = jr;
function A(a) {
  if (!(this instanceof A))
    return new A(a);
  this._overheadLength = 0, this._valueLength = 0, this._valuesToMeasure = [], fn.call(this), a = a || {};
  for (var e in a)
    this[e] = a[e];
}
Tr.inherits(A, fn);
A.LINE_BREAK = `\r
`;
A.DEFAULT_CONTENT_TYPE = "application/octet-stream";
A.prototype.append = function(a, e, n) {
  n = n || {}, typeof n == "string" && (n = { filename: n });
  var t = fn.prototype.append.bind(this);
  if ((typeof e == "number" || e == null) && (e = String(e)), Array.isArray(e)) {
    this._error(new Error("Arrays are not supported."));
    return;
  }
  var i = this._multiPartHeader(a, e, n), s = this._multiPartFooter();
  t(i), t(e), t(s), this._trackLength(i, e, n);
};
A.prototype._trackLength = function(a, e, n) {
  var t = 0;
  n.knownLength != null ? t += Number(n.knownLength) : Buffer.isBuffer(e) ? t = e.length : typeof e == "string" && (t = Buffer.byteLength(e)), this._valueLength += t, this._overheadLength += Buffer.byteLength(a) + A.LINE_BREAK.length, !(!e || !e.path && !(e.readable && de(e, "httpVersion")) && !(e instanceof qr)) && (n.knownLength || this._valuesToMeasure.push(e));
};
A.prototype._lengthRetriever = function(a, e) {
  de(a, "fd") ? a.end != null && a.end != 1 / 0 && a.start != null ? e(null, a.end + 1 - (a.start ? a.start : 0)) : Ur.stat(a.path, function(n, t) {
    if (n) {
      e(n);
      return;
    }
    var i = t.size - (a.start ? a.start : 0);
    e(null, i);
  }) : de(a, "httpVersion") ? e(null, Number(a.headers["content-length"])) : de(a, "httpModule") ? (a.on("response", function(n) {
    a.pause(), e(null, Number(n.headers["content-length"]));
  }), a.resume()) : e("Unknown stream");
};
A.prototype._multiPartHeader = function(a, e, n) {
  if (typeof n.header == "string")
    return n.header;
  var t = this._getContentDisposition(e, n), i = this._getContentType(e, n), s = "", o = {
    // add custom disposition as third element or keep it two elements if not
    "Content-Disposition": ["form-data", 'name="' + a + '"'].concat(t || []),
    // if no content type. allow it to be empty array
    "Content-Type": [].concat(i || [])
  };
  typeof n.header == "object" && Qa(o, n.header);
  var r;
  for (var p in o)
    if (de(o, p)) {
      if (r = o[p], r == null)
        continue;
      Array.isArray(r) || (r = [r]), r.length && (s += p + ": " + r.join("; ") + A.LINE_BREAK);
    }
  return "--" + this.getBoundary() + A.LINE_BREAK + s + A.LINE_BREAK;
};
A.prototype._getContentDisposition = function(a, e) {
  var n;
  if (typeof e.filepath == "string" ? n = za.normalize(e.filepath).replace(/\\/g, "/") : e.filename || a && (a.name || a.path) ? n = za.basename(e.filename || a && (a.name || a.path)) : a && a.readable && de(a, "httpVersion") && (n = za.basename(a.client._httpMessage.path || "")), n)
    return 'filename="' + n + '"';
};
A.prototype._getContentType = function(a, e) {
  var n = e.contentType;
  return !n && a && a.name && (n = Ia.lookup(a.name)), !n && a && a.path && (n = Ia.lookup(a.path)), !n && a && a.readable && de(a, "httpVersion") && (n = a.headers["content-type"]), !n && (e.filepath || e.filename) && (n = Ia.lookup(e.filepath || e.filename)), !n && a && typeof a == "object" && (n = A.DEFAULT_CONTENT_TYPE), n;
};
A.prototype._multiPartFooter = function() {
  return (function(a) {
    var e = A.LINE_BREAK, n = this._streams.length === 0;
    n && (e += this._lastBoundary()), a(e);
  }).bind(this);
};
A.prototype._lastBoundary = function() {
  return "--" + this.getBoundary() + "--" + A.LINE_BREAK;
};
A.prototype.getHeaders = function(a) {
  var e, n = {
    "content-type": "multipart/form-data; boundary=" + this.getBoundary()
  };
  for (e in a)
    de(a, e) && (n[e.toLowerCase()] = a[e]);
  return n;
};
A.prototype.setBoundary = function(a) {
  if (typeof a != "string")
    throw new TypeError("FormData boundary must be a string");
  this._boundary = a;
};
A.prototype.getBoundary = function() {
  return this._boundary || this._generateBoundary(), this._boundary;
};
A.prototype.getBuffer = function() {
  for (var a = new Buffer.alloc(0), e = this.getBoundary(), n = 0, t = this._streams.length; n < t; n++)
    typeof this._streams[n] != "function" && (Buffer.isBuffer(this._streams[n]) ? a = Buffer.concat([a, this._streams[n]]) : a = Buffer.concat([a, Buffer.from(this._streams[n])]), (typeof this._streams[n] != "string" || this._streams[n].substring(2, e.length + 2) !== e) && (a = Buffer.concat([a, Buffer.from(A.LINE_BREAK)])));
  return Buffer.concat([a, Buffer.from(this._lastBoundary())]);
};
A.prototype._generateBoundary = function() {
  this._boundary = "--------------------------" + Lr.randomBytes(12).toString("hex");
};
A.prototype.getLengthSync = function() {
  var a = this._overheadLength + this._valueLength;
  return this._streams.length && (a += this._lastBoundary().length), this.hasKnownLength() || this._error(new Error("Cannot calculate proper length in synchronous way.")), a;
};
A.prototype.hasKnownLength = function() {
  var a = !0;
  return this._valuesToMeasure.length && (a = !1), a;
};
A.prototype.getLength = function(a) {
  var e = this._overheadLength + this._valueLength;
  if (this._streams.length && (e += this._lastBoundary().length), !this._valuesToMeasure.length) {
    process.nextTick(a.bind(this, null, e));
    return;
  }
  Br.parallel(this._valuesToMeasure, this._lengthRetriever, function(n, t) {
    if (n) {
      a(n);
      return;
    }
    t.forEach(function(i) {
      e += i;
    }), a(null, e);
  });
};
A.prototype.submit = function(a, e) {
  var n, t, i = { method: "post" };
  return typeof a == "string" ? (a = Fr(a), t = Qa({
    port: a.port,
    path: a.pathname,
    host: a.hostname,
    protocol: a.protocol
  }, i)) : (t = Qa(a, i), t.port || (t.port = t.protocol === "https:" ? 443 : 80)), t.headers = this.getHeaders(a.headers), t.protocol === "https:" ? n = Pr.request(t) : n = Or.request(t), this.getLength((function(s, o) {
    if (s && s !== "Unknown stream") {
      this._error(s);
      return;
    }
    if (o && n.setHeader("Content-Length", o), this.pipe(n), e) {
      var r, p = function(d, c) {
        return n.removeListener("error", p), n.removeListener("response", r), e.call(this, d, c);
      };
      r = p.bind(this, null), n.on("error", p), n.on("response", r);
    }
  }).bind(this)), n;
};
A.prototype._error = function(a) {
  this.error || (this.error = a, this.pause(), this.emit("error", a));
};
A.prototype.toString = function() {
  return "[object FormData]";
};
Nr(A.prototype, "FormData");
var zr = A;
const pi = /* @__PURE__ */ Ht(zr);
function en(a) {
  return m.isPlainObject(a) || m.isArray(a);
}
function li(a) {
  return m.endsWith(a, "[]") ? a.slice(0, -2) : a;
}
function et(a, e, n) {
  return a ? a.concat(e).map(function(i, s) {
    return i = li(i), !n && s ? "[" + i + "]" : i;
  }).join(n ? "." : "") : e;
}
function Ir(a) {
  return m.isArray(a) && !a.some(en);
}
const $r = m.toFlatObject(m, {}, null, function(e) {
  return /^is[A-Z]/.test(e);
});
function ga(a, e, n) {
  if (!m.isObject(a))
    throw new TypeError("target must be an object");
  e = e || new (pi || FormData)(), n = m.toFlatObject(n, {
    metaTokens: !0,
    dots: !1,
    indexes: !1
  }, !1, function(v, h) {
    return !m.isUndefined(h[v]);
  });
  const t = n.metaTokens, i = n.visitor || c, s = n.dots, o = n.indexes, p = (n.Blob || typeof Blob < "u" && Blob) && m.isSpecCompliantForm(e);
  if (!m.isFunction(i))
    throw new TypeError("visitor must be a function");
  function d(f) {
    if (f === null) return "";
    if (m.isDate(f))
      return f.toISOString();
    if (m.isBoolean(f))
      return f.toString();
    if (!p && m.isBlob(f))
      throw new g("Blob is not supported. Use a Buffer instead.");
    return m.isArrayBuffer(f) || m.isTypedArray(f) ? p && typeof Blob == "function" ? new Blob([f]) : Buffer.from(f) : f;
  }
  function c(f, v, h) {
    let b = f;
    if (f && !h && typeof f == "object") {
      if (m.endsWith(v, "{}"))
        v = t ? v : v.slice(0, -2), f = JSON.stringify(f);
      else if (m.isArray(f) && Ir(f) || (m.isFileList(f) || m.endsWith(v, "[]")) && (b = m.toArray(f)))
        return v = li(v), b.forEach(function(k, T) {
          !(m.isUndefined(k) || k === null) && e.append(
            // eslint-disable-next-line no-nested-ternary
            o === !0 ? et([v], T, s) : o === null ? v : v + "[]",
            d(k)
          );
        }), !1;
    }
    return en(f) ? !0 : (e.append(et(h, v, s), d(f)), !1);
  }
  const l = [], u = Object.assign($r, {
    defaultVisitor: c,
    convertValue: d,
    isVisitable: en
  });
  function x(f, v) {
    if (!m.isUndefined(f)) {
      if (l.indexOf(f) !== -1)
        throw Error("Circular reference detected in " + v.join("."));
      l.push(f), m.forEach(f, function(b, w) {
        (!(m.isUndefined(b) || b === null) && i.call(
          e,
          b,
          m.isString(w) ? w.trim() : w,
          v,
          u
        )) === !0 && x(b, v ? v.concat(w) : [w]);
      }), l.pop();
    }
  }
  if (!m.isObject(a))
    throw new TypeError("data must be an object");
  return x(a), e;
}
function at(a) {
  const e = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(a).replace(/[!'()~]|%20|%00/g, function(t) {
    return e[t];
  });
}
function ui(a, e) {
  this._pairs = [], a && ga(a, this, e);
}
const di = ui.prototype;
di.append = function(e, n) {
  this._pairs.push([e, n]);
};
di.toString = function(e) {
  const n = e ? function(t) {
    return e.call(this, t, at);
  } : at;
  return this._pairs.map(function(i) {
    return n(i[0]) + "=" + n(i[1]);
  }, "").join("&");
};
function Dr(a) {
  return encodeURIComponent(a).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function xn(a, e, n) {
  if (!e)
    return a;
  const t = n && n.encode || Dr;
  m.isFunction(n) && (n = {
    serialize: n
  });
  const i = n && n.serialize;
  let s;
  if (i ? s = i(e, n) : s = m.isURLSearchParams(e) ? e.toString() : new ui(e, n).toString(t), s) {
    const o = a.indexOf("#");
    o !== -1 && (a = a.slice(0, o)), a += (a.indexOf("?") === -1 ? "?" : "&") + s;
  }
  return a;
}
class nt {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(e, n, t) {
    return this.handlers.push({
      fulfilled: e,
      rejected: n,
      synchronous: t ? t.synchronous : !1,
      runWhen: t ? t.runWhen : null
    }), this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(e) {
    this.handlers[e] && (this.handlers[e] = null);
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    this.handlers && (this.handlers = []);
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(e) {
    m.forEach(this.handlers, function(t) {
      t !== null && e(t);
    });
  }
}
const hn = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1
}, Mr = ma.URLSearchParams, $a = "abcdefghijklmnopqrstuvwxyz", tt = "0123456789", mi = {
  DIGIT: tt,
  ALPHA: $a,
  ALPHA_DIGIT: $a + $a.toUpperCase() + tt
}, Hr = (a = 16, e = mi.ALPHA_DIGIT) => {
  let n = "";
  const { length: t } = e, i = new Uint32Array(a);
  Ot.randomFillSync(i);
  for (let s = 0; s < a; s++)
    n += e[i[s] % t];
  return n;
}, Gr = {
  isNode: !0,
  classes: {
    URLSearchParams: Mr,
    FormData: pi,
    Blob: typeof Blob < "u" && Blob || null
  },
  ALPHABET: mi,
  generateString: Hr,
  protocols: ["http", "https", "file", "data"]
}, vn = typeof window < "u" && typeof document < "u", an = typeof navigator == "object" && navigator || void 0, Wr = vn && (!an || ["ReactNative", "NativeScript", "NS"].indexOf(an.product) < 0), Vr = typeof WorkerGlobalScope < "u" && // eslint-disable-next-line no-undef
self instanceof WorkerGlobalScope && typeof self.importScripts == "function", Jr = vn && window.location.href || "http://localhost", Kr = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv: vn,
  hasStandardBrowserEnv: Wr,
  hasStandardBrowserWebWorkerEnv: Vr,
  navigator: an,
  origin: Jr
}, Symbol.toStringTag, { value: "Module" })), F = {
  ...Kr,
  ...Gr
};
function Xr(a, e) {
  return ga(a, new F.classes.URLSearchParams(), {
    visitor: function(n, t, i, s) {
      return F.isNode && m.isBuffer(n) ? (this.append(t, n.toString("base64")), !1) : s.defaultVisitor.apply(this, arguments);
    },
    ...e
  });
}
function Yr(a) {
  return m.matchAll(/\w+|\[(\w*)]/g, a).map((e) => e[0] === "[]" ? "" : e[1] || e[0]);
}
function Zr(a) {
  const e = {}, n = Object.keys(a);
  let t;
  const i = n.length;
  let s;
  for (t = 0; t < i; t++)
    s = n[t], e[s] = a[s];
  return e;
}
function fi(a) {
  function e(n, t, i, s) {
    let o = n[s++];
    if (o === "__proto__") return !0;
    const r = Number.isFinite(+o), p = s >= n.length;
    return o = !o && m.isArray(i) ? i.length : o, p ? (m.hasOwnProp(i, o) ? i[o] = [i[o], t] : i[o] = t, !r) : ((!i[o] || !m.isObject(i[o])) && (i[o] = []), e(n, t, i[o], s) && m.isArray(i[o]) && (i[o] = Zr(i[o])), !r);
  }
  if (m.isFormData(a) && m.isFunction(a.entries)) {
    const n = {};
    return m.forEachEntry(a, (t, i) => {
      e(Yr(t), i, n, 0);
    }), n;
  }
  return null;
}
function Qr(a, e, n) {
  if (m.isString(a))
    try {
      return (e || JSON.parse)(a), m.trim(a);
    } catch (t) {
      if (t.name !== "SyntaxError")
        throw t;
    }
  return (n || JSON.stringify)(a);
}
const We = {
  transitional: hn,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function(e, n) {
    const t = n.getContentType() || "", i = t.indexOf("application/json") > -1, s = m.isObject(e);
    if (s && m.isHTMLForm(e) && (e = new FormData(e)), m.isFormData(e))
      return i ? JSON.stringify(fi(e)) : e;
    if (m.isArrayBuffer(e) || m.isBuffer(e) || m.isStream(e) || m.isFile(e) || m.isBlob(e) || m.isReadableStream(e))
      return e;
    if (m.isArrayBufferView(e))
      return e.buffer;
    if (m.isURLSearchParams(e))
      return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), e.toString();
    let r;
    if (s) {
      if (t.indexOf("application/x-www-form-urlencoded") > -1)
        return Xr(e, this.formSerializer).toString();
      if ((r = m.isFileList(e)) || t.indexOf("multipart/form-data") > -1) {
        const p = this.env && this.env.FormData;
        return ga(
          r ? { "files[]": e } : e,
          p && new p(),
          this.formSerializer
        );
      }
    }
    return s || i ? (n.setContentType("application/json", !1), Qr(e)) : e;
  }],
  transformResponse: [function(e) {
    const n = this.transitional || We.transitional, t = n && n.forcedJSONParsing, i = this.responseType === "json";
    if (m.isResponse(e) || m.isReadableStream(e))
      return e;
    if (e && m.isString(e) && (t && !this.responseType || i)) {
      const o = !(n && n.silentJSONParsing) && i;
      try {
        return JSON.parse(e, this.parseReviver);
      } catch (r) {
        if (o)
          throw r.name === "SyntaxError" ? g.from(r, g.ERR_BAD_RESPONSE, this, null, this.response) : r;
      }
    }
    return e;
  }],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: F.classes.FormData,
    Blob: F.classes.Blob
  },
  validateStatus: function(e) {
    return e >= 200 && e < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
m.forEach(["delete", "get", "head", "post", "put", "patch"], (a) => {
  We.headers[a] = {};
});
const ec = m.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]), ac = (a) => {
  const e = {};
  let n, t, i;
  return a && a.split(`
`).forEach(function(o) {
    i = o.indexOf(":"), n = o.substring(0, i).trim().toLowerCase(), t = o.substring(i + 1).trim(), !(!n || e[n] && ec[n]) && (n === "set-cookie" ? e[n] ? e[n].push(t) : e[n] = [t] : e[n] = e[n] ? e[n] + ", " + t : t);
  }), e;
}, it = Symbol("internals");
function qe(a) {
  return a && String(a).trim().toLowerCase();
}
function sa(a) {
  return a === !1 || a == null ? a : m.isArray(a) ? a.map(sa) : String(a);
}
function nc(a) {
  const e = /* @__PURE__ */ Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let t;
  for (; t = n.exec(a); )
    e[t[1]] = t[2];
  return e;
}
const tc = (a) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(a.trim());
function Da(a, e, n, t, i) {
  if (m.isFunction(t))
    return t.call(this, e, n);
  if (i && (e = n), !!m.isString(e)) {
    if (m.isString(t))
      return e.indexOf(t) !== -1;
    if (m.isRegExp(t))
      return t.test(e);
  }
}
function ic(a) {
  return a.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, n, t) => n.toUpperCase() + t);
}
function sc(a, e) {
  const n = m.toCamelCase(" " + e);
  ["get", "set", "has"].forEach((t) => {
    Object.defineProperty(a, t + n, {
      value: function(i, s, o) {
        return this[t].call(this, e, i, s, o);
      },
      configurable: !0
    });
  });
}
let $ = class {
  constructor(e) {
    e && this.set(e);
  }
  set(e, n, t) {
    const i = this;
    function s(r, p, d) {
      const c = qe(p);
      if (!c)
        throw new Error("header name must be a non-empty string");
      const l = m.findKey(i, c);
      (!l || i[l] === void 0 || d === !0 || d === void 0 && i[l] !== !1) && (i[l || p] = sa(r));
    }
    const o = (r, p) => m.forEach(r, (d, c) => s(d, c, p));
    if (m.isPlainObject(e) || e instanceof this.constructor)
      o(e, n);
    else if (m.isString(e) && (e = e.trim()) && !tc(e))
      o(ac(e), n);
    else if (m.isObject(e) && m.isIterable(e)) {
      let r = {}, p, d;
      for (const c of e) {
        if (!m.isArray(c))
          throw TypeError("Object iterator must return a key-value pair");
        r[d = c[0]] = (p = r[d]) ? m.isArray(p) ? [...p, c[1]] : [p, c[1]] : c[1];
      }
      o(r, n);
    } else
      e != null && s(n, e, t);
    return this;
  }
  get(e, n) {
    if (e = qe(e), e) {
      const t = m.findKey(this, e);
      if (t) {
        const i = this[t];
        if (!n)
          return i;
        if (n === !0)
          return nc(i);
        if (m.isFunction(n))
          return n.call(this, i, t);
        if (m.isRegExp(n))
          return n.exec(i);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(e, n) {
    if (e = qe(e), e) {
      const t = m.findKey(this, e);
      return !!(t && this[t] !== void 0 && (!n || Da(this, this[t], t, n)));
    }
    return !1;
  }
  delete(e, n) {
    const t = this;
    let i = !1;
    function s(o) {
      if (o = qe(o), o) {
        const r = m.findKey(t, o);
        r && (!n || Da(t, t[r], r, n)) && (delete t[r], i = !0);
      }
    }
    return m.isArray(e) ? e.forEach(s) : s(e), i;
  }
  clear(e) {
    const n = Object.keys(this);
    let t = n.length, i = !1;
    for (; t--; ) {
      const s = n[t];
      (!e || Da(this, this[s], s, e, !0)) && (delete this[s], i = !0);
    }
    return i;
  }
  normalize(e) {
    const n = this, t = {};
    return m.forEach(this, (i, s) => {
      const o = m.findKey(t, s);
      if (o) {
        n[o] = sa(i), delete n[s];
        return;
      }
      const r = e ? ic(s) : String(s).trim();
      r !== s && delete n[s], n[r] = sa(i), t[r] = !0;
    }), this;
  }
  concat(...e) {
    return this.constructor.concat(this, ...e);
  }
  toJSON(e) {
    const n = /* @__PURE__ */ Object.create(null);
    return m.forEach(this, (t, i) => {
      t != null && t !== !1 && (n[i] = e && m.isArray(t) ? t.join(", ") : t);
    }), n;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([e, n]) => e + ": " + n).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(e) {
    return e instanceof this ? e : new this(e);
  }
  static concat(e, ...n) {
    const t = new this(e);
    return n.forEach((i) => t.set(i)), t;
  }
  static accessor(e) {
    const t = (this[it] = this[it] = {
      accessors: {}
    }).accessors, i = this.prototype;
    function s(o) {
      const r = qe(o);
      t[r] || (sc(i, o), t[r] = !0);
    }
    return m.isArray(e) ? e.forEach(s) : s(e), this;
  }
};
$.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
m.reduceDescriptors($.prototype, ({ value: a }, e) => {
  let n = e[0].toUpperCase() + e.slice(1);
  return {
    get: () => a,
    set(t) {
      this[n] = t;
    }
  };
});
m.freezeMethods($);
function Ma(a, e) {
  const n = this || We, t = e || n, i = $.from(t.headers);
  let s = t.data;
  return m.forEach(a, function(r) {
    s = r.call(n, s, i.normalize(), e ? e.status : void 0);
  }), i.normalize(), s;
}
function xi(a) {
  return !!(a && a.__CANCEL__);
}
function fe(a, e, n) {
  g.call(this, a ?? "canceled", g.ERR_CANCELED, e, n), this.name = "CanceledError";
}
m.inherits(fe, g, {
  __CANCEL__: !0
});
function Ae(a, e, n) {
  const t = n.config.validateStatus;
  !n.status || !t || t(n.status) ? a(n) : e(new g(
    "Request failed with status code " + n.status,
    [g.ERR_BAD_REQUEST, g.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4],
    n.config,
    n.request,
    n
  ));
}
function oc(a) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(a);
}
function rc(a, e) {
  return e ? a.replace(/\/?\/$/, "") + "/" + e.replace(/^\/+/, "") : a;
}
function bn(a, e, n) {
  let t = !oc(e);
  return a && (t || n == !1) ? rc(a, e) : e;
}
var hi = {}, cc = ma.parse, pc = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
}, lc = String.prototype.endsWith || function(a) {
  return a.length <= this.length && this.indexOf(a, this.length - a.length) !== -1;
};
function uc(a) {
  var e = typeof a == "string" ? cc(a) : a || {}, n = e.protocol, t = e.host, i = e.port;
  if (typeof t != "string" || !t || typeof n != "string" || (n = n.split(":", 1)[0], t = t.replace(/:\d*$/, ""), i = parseInt(i) || pc[n] || 0, !dc(t, i)))
    return "";
  var s = je("npm_config_" + n + "_proxy") || je(n + "_proxy") || je("npm_config_proxy") || je("all_proxy");
  return s && s.indexOf("://") === -1 && (s = n + "://" + s), s;
}
function dc(a, e) {
  var n = (je("npm_config_no_proxy") || je("no_proxy")).toLowerCase();
  return n ? n === "*" ? !1 : n.split(/[,\s]/).every(function(t) {
    if (!t)
      return !0;
    var i = t.match(/^(.+):(\d+)$/), s = i ? i[1] : t, o = i ? parseInt(i[2]) : 0;
    return o && o !== e ? !0 : /^[.*]/.test(s) ? (s.charAt(0) === "*" && (s = s.slice(1)), !lc.call(a, s)) : a !== s;
  }) : !0;
}
function je(a) {
  return process.env[a.toLowerCase()] || process.env[a.toUpperCase()] || "";
}
hi.getProxyForUrl = uc;
var gn = { exports: {} }, Ye = { exports: {} }, Ze = { exports: {} }, Ha, st;
function mc() {
  if (st) return Ha;
  st = 1;
  var a = 1e3, e = a * 60, n = e * 60, t = n * 24, i = t * 7, s = t * 365.25;
  Ha = function(c, l) {
    l = l || {};
    var u = typeof c;
    if (u === "string" && c.length > 0)
      return o(c);
    if (u === "number" && isFinite(c))
      return l.long ? p(c) : r(c);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(c)
    );
  };
  function o(c) {
    if (c = String(c), !(c.length > 100)) {
      var l = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        c
      );
      if (l) {
        var u = parseFloat(l[1]), x = (l[2] || "ms").toLowerCase();
        switch (x) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return u * s;
          case "weeks":
          case "week":
          case "w":
            return u * i;
          case "days":
          case "day":
          case "d":
            return u * t;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return u * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return u * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return u * a;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return u;
          default:
            return;
        }
      }
    }
  }
  function r(c) {
    var l = Math.abs(c);
    return l >= t ? Math.round(c / t) + "d" : l >= n ? Math.round(c / n) + "h" : l >= e ? Math.round(c / e) + "m" : l >= a ? Math.round(c / a) + "s" : c + "ms";
  }
  function p(c) {
    var l = Math.abs(c);
    return l >= t ? d(c, l, t, "day") : l >= n ? d(c, l, n, "hour") : l >= e ? d(c, l, e, "minute") : l >= a ? d(c, l, a, "second") : c + " ms";
  }
  function d(c, l, u, x) {
    var f = l >= u * 1.5;
    return Math.round(c / u) + " " + x + (f ? "s" : "");
  }
  return Ha;
}
var Ga, ot;
function vi() {
  if (ot) return Ga;
  ot = 1;
  function a(e) {
    t.debug = t, t.default = t, t.coerce = d, t.disable = r, t.enable = s, t.enabled = p, t.humanize = mc(), t.destroy = c, Object.keys(e).forEach((l) => {
      t[l] = e[l];
    }), t.names = [], t.skips = [], t.formatters = {};
    function n(l) {
      let u = 0;
      for (let x = 0; x < l.length; x++)
        u = (u << 5) - u + l.charCodeAt(x), u |= 0;
      return t.colors[Math.abs(u) % t.colors.length];
    }
    t.selectColor = n;
    function t(l) {
      let u, x = null, f, v;
      function h(...b) {
        if (!h.enabled)
          return;
        const w = h, k = Number(/* @__PURE__ */ new Date()), T = k - (u || k);
        w.diff = T, w.prev = u, w.curr = k, u = k, b[0] = t.coerce(b[0]), typeof b[0] != "string" && b.unshift("%O");
        let B = 0;
        b[0] = b[0].replace(/%([a-zA-Z%])/g, (P, N) => {
          if (P === "%%")
            return "%";
          B++;
          const Z = t.formatters[N];
          if (typeof Z == "function") {
            const ce = b[B];
            P = Z.call(w, ce), b.splice(B, 1), B--;
          }
          return P;
        }), t.formatArgs.call(w, b), (w.log || t.log).apply(w, b);
      }
      return h.namespace = l, h.useColors = t.useColors(), h.color = t.selectColor(l), h.extend = i, h.destroy = t.destroy, Object.defineProperty(h, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => x !== null ? x : (f !== t.namespaces && (f = t.namespaces, v = t.enabled(l)), v),
        set: (b) => {
          x = b;
        }
      }), typeof t.init == "function" && t.init(h), h;
    }
    function i(l, u) {
      const x = t(this.namespace + (typeof u > "u" ? ":" : u) + l);
      return x.log = this.log, x;
    }
    function s(l) {
      t.save(l), t.namespaces = l, t.names = [], t.skips = [];
      const u = (typeof l == "string" ? l : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const x of u)
        x[0] === "-" ? t.skips.push(x.slice(1)) : t.names.push(x);
    }
    function o(l, u) {
      let x = 0, f = 0, v = -1, h = 0;
      for (; x < l.length; )
        if (f < u.length && (u[f] === l[x] || u[f] === "*"))
          u[f] === "*" ? (v = f, h = x, f++) : (x++, f++);
        else if (v !== -1)
          f = v + 1, h++, x = h;
        else
          return !1;
      for (; f < u.length && u[f] === "*"; )
        f++;
      return f === u.length;
    }
    function r() {
      const l = [
        ...t.names,
        ...t.skips.map((u) => "-" + u)
      ].join(",");
      return t.enable(""), l;
    }
    function p(l) {
      for (const u of t.skips)
        if (o(l, u))
          return !1;
      for (const u of t.names)
        if (o(l, u))
          return !0;
      return !1;
    }
    function d(l) {
      return l instanceof Error ? l.stack || l.message : l;
    }
    function c() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return t.enable(t.load()), t;
  }
  return Ga = a, Ga;
}
var rt;
function fc() {
  return rt || (rt = 1, function(a, e) {
    e.formatArgs = t, e.save = i, e.load = s, e.useColors = n, e.storage = o(), e.destroy = /* @__PURE__ */ (() => {
      let p = !1;
      return () => {
        p || (p = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let p;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (p = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(p[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function t(p) {
      if (p[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + p[0] + (this.useColors ? "%c " : " ") + "+" + a.exports.humanize(this.diff), !this.useColors)
        return;
      const d = "color: " + this.color;
      p.splice(1, 0, d, "color: inherit");
      let c = 0, l = 0;
      p[0].replace(/%[a-zA-Z%]/g, (u) => {
        u !== "%%" && (c++, u === "%c" && (l = c));
      }), p.splice(l, 0, d);
    }
    e.log = console.debug || console.log || (() => {
    });
    function i(p) {
      try {
        p ? e.storage.setItem("debug", p) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function s() {
      let p;
      try {
        p = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !p && typeof process < "u" && "env" in process && (p = process.env.DEBUG), p;
    }
    function o() {
      try {
        return localStorage;
      } catch {
      }
    }
    a.exports = vi()(e);
    const { formatters: r } = a.exports;
    r.j = function(p) {
      try {
        return JSON.stringify(p);
      } catch (d) {
        return "[UnexpectedJSONParseError]: " + d.message;
      }
    };
  }(Ze, Ze.exports)), Ze.exports;
}
var Qe = { exports: {} }, Wa, ct;
function xc() {
  return ct || (ct = 1, Wa = (a, e = process.argv) => {
    const n = a.startsWith("-") ? "" : a.length === 1 ? "-" : "--", t = e.indexOf(n + a), i = e.indexOf("--");
    return t !== -1 && (i === -1 || t < i);
  }), Wa;
}
var Va, pt;
function hc() {
  if (pt) return Va;
  pt = 1;
  const a = Ji, e = Ft, n = xc(), { env: t } = process;
  let i;
  n("no-color") || n("no-colors") || n("color=false") || n("color=never") ? i = 0 : (n("color") || n("colors") || n("color=true") || n("color=always")) && (i = 1), "FORCE_COLOR" in t && (t.FORCE_COLOR === "true" ? i = 1 : t.FORCE_COLOR === "false" ? i = 0 : i = t.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(t.FORCE_COLOR, 10), 3));
  function s(p) {
    return p === 0 ? !1 : {
      level: p,
      hasBasic: !0,
      has256: p >= 2,
      has16m: p >= 3
    };
  }
  function o(p, d) {
    if (i === 0)
      return 0;
    if (n("color=16m") || n("color=full") || n("color=truecolor"))
      return 3;
    if (n("color=256"))
      return 2;
    if (p && !d && i === void 0)
      return 0;
    const c = i || 0;
    if (t.TERM === "dumb")
      return c;
    if (process.platform === "win32") {
      const l = a.release().split(".");
      return Number(l[0]) >= 10 && Number(l[2]) >= 10586 ? Number(l[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in t)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((l) => l in t) || t.CI_NAME === "codeship" ? 1 : c;
    if ("TEAMCITY_VERSION" in t)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(t.TEAMCITY_VERSION) ? 1 : 0;
    if (t.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in t) {
      const l = parseInt((t.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (t.TERM_PROGRAM) {
        case "iTerm.app":
          return l >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(t.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(t.TERM) || "COLORTERM" in t ? 1 : c;
  }
  function r(p) {
    const d = o(p, p && p.isTTY);
    return s(d);
  }
  return Va = {
    supportsColor: r,
    stdout: s(o(!0, e.isatty(1))),
    stderr: s(o(!0, e.isatty(2)))
  }, Va;
}
var lt;
function vc() {
  return lt || (lt = 1, function(a, e) {
    const n = Ft, t = Se;
    e.init = c, e.log = r, e.formatArgs = s, e.save = p, e.load = d, e.useColors = i, e.destroy = t.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), e.colors = [6, 2, 3, 4, 5, 1];
    try {
      const u = hc();
      u && (u.stderr || u).level >= 2 && (e.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    e.inspectOpts = Object.keys(process.env).filter((u) => /^debug_/i.test(u)).reduce((u, x) => {
      const f = x.substring(6).toLowerCase().replace(/_([a-z])/g, (h, b) => b.toUpperCase());
      let v = process.env[x];
      return /^(yes|on|true|enabled)$/i.test(v) ? v = !0 : /^(no|off|false|disabled)$/i.test(v) ? v = !1 : v === "null" ? v = null : v = Number(v), u[f] = v, u;
    }, {});
    function i() {
      return "colors" in e.inspectOpts ? !!e.inspectOpts.colors : n.isatty(process.stderr.fd);
    }
    function s(u) {
      const { namespace: x, useColors: f } = this;
      if (f) {
        const v = this.color, h = "\x1B[3" + (v < 8 ? v : "8;5;" + v), b = `  ${h};1m${x} \x1B[0m`;
        u[0] = b + u[0].split(`
`).join(`
` + b), u.push(h + "m+" + a.exports.humanize(this.diff) + "\x1B[0m");
      } else
        u[0] = o() + x + " " + u[0];
    }
    function o() {
      return e.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function r(...u) {
      return process.stderr.write(t.formatWithOptions(e.inspectOpts, ...u) + `
`);
    }
    function p(u) {
      u ? process.env.DEBUG = u : delete process.env.DEBUG;
    }
    function d() {
      return process.env.DEBUG;
    }
    function c(u) {
      u.inspectOpts = {};
      const x = Object.keys(e.inspectOpts);
      for (let f = 0; f < x.length; f++)
        u.inspectOpts[x[f]] = e.inspectOpts[x[f]];
    }
    a.exports = vi()(e);
    const { formatters: l } = a.exports;
    l.o = function(u) {
      return this.inspectOpts.colors = this.useColors, t.inspect(u, this.inspectOpts).split(`
`).map((x) => x.trim()).join(" ");
    }, l.O = function(u) {
      return this.inspectOpts.colors = this.useColors, t.inspect(u, this.inspectOpts);
    };
  }(Qe, Qe.exports)), Qe.exports;
}
var ut;
function bc() {
  return ut || (ut = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? Ye.exports = fc() : Ye.exports = vc()), Ye.exports;
}
var Le, gc = function() {
  if (!Le) {
    try {
      Le = bc()("follow-redirects");
    } catch {
    }
    typeof Le != "function" && (Le = function() {
    });
  }
  Le.apply(null, arguments);
}, Ve = ma, ze = Ve.URL, yc = cn, wc = pn, yn = W.Writable, wn = Vi, bi = gc;
(function() {
  var e = typeof process < "u", n = typeof window < "u" && typeof document < "u", t = _e(Error.captureStackTrace);
  !e && (n || !t) && console.warn("The follow-redirects package should be excluded from browser builds.");
})();
var _n = !1;
try {
  wn(new ze(""));
} catch (a) {
  _n = a.code === "ERR_INVALID_URL";
}
var _c = [
  "auth",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "hash"
], kn = ["abort", "aborted", "connect", "error", "socket", "timeout"], Sn = /* @__PURE__ */ Object.create(null);
kn.forEach(function(a) {
  Sn[a] = function(e, n, t) {
    this._redirectable.emit(a, e, n, t);
  };
});
var nn = Je(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
), tn = Je(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
), kc = Je(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  tn
), Sc = Je(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
), Cc = Je(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
), Ec = yn.prototype.destroy || yi;
function K(a, e) {
  yn.call(this), this._sanitizeOptions(a), this._options = a, this._ended = !1, this._ending = !1, this._redirectCount = 0, this._redirects = [], this._requestBodyLength = 0, this._requestBodyBuffers = [], e && this.on("response", e);
  var n = this;
  this._onNativeResponse = function(t) {
    try {
      n._processResponse(t);
    } catch (i) {
      n.emit("error", i instanceof tn ? i : new tn({ cause: i }));
    }
  }, this._performRequest();
}
K.prototype = Object.create(yn.prototype);
K.prototype.abort = function() {
  En(this._currentRequest), this._currentRequest.abort(), this.emit("abort");
};
K.prototype.destroy = function(a) {
  return En(this._currentRequest, a), Ec.call(this, a), this;
};
K.prototype.write = function(a, e, n) {
  if (this._ending)
    throw new Cc();
  if (!ye(a) && !jc(a))
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  if (_e(e) && (n = e, e = null), a.length === 0) {
    n && n();
    return;
  }
  this._requestBodyLength + a.length <= this._options.maxBodyLength ? (this._requestBodyLength += a.length, this._requestBodyBuffers.push({ data: a, encoding: e }), this._currentRequest.write(a, e, n)) : (this.emit("error", new Sc()), this.abort());
};
K.prototype.end = function(a, e, n) {
  if (_e(a) ? (n = a, a = e = null) : _e(e) && (n = e, e = null), !a)
    this._ended = this._ending = !0, this._currentRequest.end(null, null, n);
  else {
    var t = this, i = this._currentRequest;
    this.write(a, e, function() {
      t._ended = !0, i.end(null, null, n);
    }), this._ending = !0;
  }
};
K.prototype.setHeader = function(a, e) {
  this._options.headers[a] = e, this._currentRequest.setHeader(a, e);
};
K.prototype.removeHeader = function(a) {
  delete this._options.headers[a], this._currentRequest.removeHeader(a);
};
K.prototype.setTimeout = function(a, e) {
  var n = this;
  function t(o) {
    o.setTimeout(a), o.removeListener("timeout", o.destroy), o.addListener("timeout", o.destroy);
  }
  function i(o) {
    n._timeout && clearTimeout(n._timeout), n._timeout = setTimeout(function() {
      n.emit("timeout"), s();
    }, a), t(o);
  }
  function s() {
    n._timeout && (clearTimeout(n._timeout), n._timeout = null), n.removeListener("abort", s), n.removeListener("error", s), n.removeListener("response", s), n.removeListener("close", s), e && n.removeListener("timeout", e), n.socket || n._currentRequest.removeListener("socket", i);
  }
  return e && this.on("timeout", e), this.socket ? i(this.socket) : this._currentRequest.once("socket", i), this.on("socket", t), this.on("abort", s), this.on("error", s), this.on("response", s), this.on("close", s), this;
};
[
  "flushHeaders",
  "getHeader",
  "setNoDelay",
  "setSocketKeepAlive"
].forEach(function(a) {
  K.prototype[a] = function(e, n) {
    return this._currentRequest[a](e, n);
  };
});
["aborted", "connection", "socket"].forEach(function(a) {
  Object.defineProperty(K.prototype, a, {
    get: function() {
      return this._currentRequest[a];
    }
  });
});
K.prototype._sanitizeOptions = function(a) {
  if (a.headers || (a.headers = {}), a.host && (a.hostname || (a.hostname = a.host), delete a.host), !a.pathname && a.path) {
    var e = a.path.indexOf("?");
    e < 0 ? a.pathname = a.path : (a.pathname = a.path.substring(0, e), a.search = a.path.substring(e));
  }
};
K.prototype._performRequest = function() {
  var a = this._options.protocol, e = this._options.nativeProtocols[a];
  if (!e)
    throw new TypeError("Unsupported protocol " + a);
  if (this._options.agents) {
    var n = a.slice(0, -1);
    this._options.agent = this._options.agents[n];
  }
  var t = this._currentRequest = e.request(this._options, this._onNativeResponse);
  t._redirectable = this;
  for (var i of kn)
    t.on(i, Sn[i]);
  if (this._currentUrl = /^\//.test(this._options.path) ? Ve.format(this._options) : (
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path
  ), this._isRedirect) {
    var s = 0, o = this, r = this._requestBodyBuffers;
    (function p(d) {
      if (t === o._currentRequest)
        if (d)
          o.emit("error", d);
        else if (s < r.length) {
          var c = r[s++];
          t.finished || t.write(c.data, c.encoding, p);
        } else o._ended && t.end();
    })();
  }
};
K.prototype._processResponse = function(a) {
  var e = a.statusCode;
  this._options.trackRedirects && this._redirects.push({
    url: this._currentUrl,
    headers: a.headers,
    statusCode: e
  });
  var n = a.headers.location;
  if (!n || this._options.followRedirects === !1 || e < 300 || e >= 400) {
    a.responseUrl = this._currentUrl, a.redirects = this._redirects, this.emit("response", a), this._requestBodyBuffers = [];
    return;
  }
  if (En(this._currentRequest), a.destroy(), ++this._redirectCount > this._options.maxRedirects)
    throw new kc();
  var t, i = this._options.beforeRedirect;
  i && (t = Object.assign({
    // The Host header was set by nativeProtocol.request
    Host: a.req.getHeader("host")
  }, this._options.headers));
  var s = this._options.method;
  ((e === 301 || e === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
  // the server is redirecting the user agent to a different resource […]
  // A user agent can perform a retrieval request targeting that URI
  // (a GET or HEAD request if using HTTP) […]
  e === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) && (this._options.method = "GET", this._requestBodyBuffers = [], Ja(/^content-/i, this._options.headers));
  var o = Ja(/^host$/i, this._options.headers), r = Cn(this._currentUrl), p = o || r.host, d = /^\w+:/.test(n) ? this._currentUrl : Ve.format(Object.assign(r, { host: p })), c = Rc(n, d);
  if (bi("redirecting to", c.href), this._isRedirect = !0, sn(c, this._options), (c.protocol !== r.protocol && c.protocol !== "https:" || c.host !== p && !Ac(c.host, p)) && Ja(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers), _e(i)) {
    var l = {
      headers: a.headers,
      statusCode: e
    }, u = {
      url: d,
      method: s,
      headers: t
    };
    i(this._options, l, u), this._sanitizeOptions(this._options);
  }
  this._performRequest();
};
function gi(a) {
  var e = {
    maxRedirects: 21,
    maxBodyLength: 10485760
  }, n = {};
  return Object.keys(a).forEach(function(t) {
    var i = t + ":", s = n[i] = a[t], o = e[t] = Object.create(s);
    function r(d, c, l) {
      return Tc(d) ? d = sn(d) : ye(d) ? d = sn(Cn(d)) : (l = c, c = wi(d), d = { protocol: i }), _e(c) && (l = c, c = null), c = Object.assign({
        maxRedirects: e.maxRedirects,
        maxBodyLength: e.maxBodyLength
      }, d, c), c.nativeProtocols = n, !ye(c.host) && !ye(c.hostname) && (c.hostname = "::1"), wn.equal(c.protocol, i, "protocol mismatch"), bi("options", c), new K(c, l);
    }
    function p(d, c, l) {
      var u = o.request(d, c, l);
      return u.end(), u;
    }
    Object.defineProperties(o, {
      request: { value: r, configurable: !0, enumerable: !0, writable: !0 },
      get: { value: p, configurable: !0, enumerable: !0, writable: !0 }
    });
  }), e;
}
function yi() {
}
function Cn(a) {
  var e;
  if (_n)
    e = new ze(a);
  else if (e = wi(Ve.parse(a)), !ye(e.protocol))
    throw new nn({ input: a });
  return e;
}
function Rc(a, e) {
  return _n ? new ze(a, e) : Cn(Ve.resolve(e, a));
}
function wi(a) {
  if (/^\[/.test(a.hostname) && !/^\[[:0-9a-f]+\]$/i.test(a.hostname))
    throw new nn({ input: a.href || a });
  if (/^\[/.test(a.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(a.host))
    throw new nn({ input: a.href || a });
  return a;
}
function sn(a, e) {
  var n = e || {};
  for (var t of _c)
    n[t] = a[t];
  return n.hostname.startsWith("[") && (n.hostname = n.hostname.slice(1, -1)), n.port !== "" && (n.port = Number(n.port)), n.path = n.search ? n.pathname + n.search : n.pathname, n;
}
function Ja(a, e) {
  var n;
  for (var t in e)
    a.test(t) && (n = e[t], delete e[t]);
  return n === null || typeof n > "u" ? void 0 : String(n).trim();
}
function Je(a, e, n) {
  function t(i) {
    _e(Error.captureStackTrace) && Error.captureStackTrace(this, this.constructor), Object.assign(this, i || {}), this.code = a, this.message = this.cause ? e + ": " + this.cause.message : e;
  }
  return t.prototype = new (n || Error)(), Object.defineProperties(t.prototype, {
    constructor: {
      value: t,
      enumerable: !1
    },
    name: {
      value: "Error [" + a + "]",
      enumerable: !1
    }
  }), t;
}
function En(a, e) {
  for (var n of kn)
    a.removeListener(n, Sn[n]);
  a.on("error", yi), a.destroy(e);
}
function Ac(a, e) {
  wn(ye(a) && ye(e));
  var n = a.length - e.length - 1;
  return n > 0 && a[n] === "." && a.endsWith(e);
}
function ye(a) {
  return typeof a == "string" || a instanceof String;
}
function _e(a) {
  return typeof a == "function";
}
function jc(a) {
  return typeof a == "object" && "length" in a;
}
function Tc(a) {
  return ze && a instanceof ze;
}
gn.exports = gi({ http: yc, https: wc });
gn.exports.wrap = gi;
var Oc = gn.exports;
const Pc = /* @__PURE__ */ Ht(Oc), pa = "1.13.2";
function _i(a) {
  const e = /^([-+\w]{1,25})(:?\/\/|:)/.exec(a);
  return e && e[1] || "";
}
const Fc = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function Uc(a, e, n) {
  const t = n && n.Blob || F.classes.Blob, i = _i(a);
  if (e === void 0 && t && (e = !0), i === "data") {
    a = i.length ? a.slice(i.length + 1) : a;
    const s = Fc.exec(a);
    if (!s)
      throw new g("Invalid URL", g.ERR_INVALID_URL);
    const o = s[1], r = s[2], p = s[3], d = Buffer.from(decodeURIComponent(p), r ? "base64" : "utf8");
    if (e) {
      if (!t)
        throw new g("Blob is not supported", g.ERR_NOT_SUPPORT);
      return new t([d], { type: o });
    }
    return d;
  }
  throw new g("Unsupported protocol " + i, g.ERR_NOT_SUPPORT);
}
const Ka = Symbol("internals");
class dt extends W.Transform {
  constructor(e) {
    e = m.toFlatObject(e, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (t, i) => !m.isUndefined(i[t])), super({
      readableHighWaterMark: e.chunkSize
    });
    const n = this[Ka] = {
      timeWindow: e.timeWindow,
      chunkSize: e.chunkSize,
      maxRate: e.maxRate,
      minChunkSize: e.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (t) => {
      t === "progress" && (n.isCaptured || (n.isCaptured = !0));
    });
  }
  _read(e) {
    const n = this[Ka];
    return n.onReadCallback && n.onReadCallback(), super._read(e);
  }
  _transform(e, n, t) {
    const i = this[Ka], s = i.maxRate, o = this.readableHighWaterMark, r = i.timeWindow, p = 1e3 / r, d = s / p, c = i.minChunkSize !== !1 ? Math.max(i.minChunkSize, d * 0.01) : 0, l = (x, f) => {
      const v = Buffer.byteLength(x);
      i.bytesSeen += v, i.bytes += v, i.isCaptured && this.emit("progress", i.bytesSeen), this.push(x) ? process.nextTick(f) : i.onReadCallback = () => {
        i.onReadCallback = null, process.nextTick(f);
      };
    }, u = (x, f) => {
      const v = Buffer.byteLength(x);
      let h = null, b = o, w, k = 0;
      if (s) {
        const T = Date.now();
        (!i.ts || (k = T - i.ts) >= r) && (i.ts = T, w = d - i.bytes, i.bytes = w < 0 ? -w : 0, k = 0), w = d - i.bytes;
      }
      if (s) {
        if (w <= 0)
          return setTimeout(() => {
            f(null, x);
          }, r - k);
        w < b && (b = w);
      }
      b && v > b && v - b > c && (h = x.subarray(b), x = x.subarray(0, b)), l(x, h ? () => {
        process.nextTick(f, null, h);
      } : f);
    };
    u(e, function x(f, v) {
      if (f)
        return t(f);
      v ? u(v, x) : t(null);
    });
  }
}
const { asyncIterator: mt } = Symbol, ki = async function* (a) {
  a.stream ? yield* a.stream() : a.arrayBuffer ? yield await a.arrayBuffer() : a[mt] ? yield* a[mt]() : yield a;
}, qc = F.ALPHABET.ALPHA_DIGIT + "-_", Ie = typeof TextEncoder == "function" ? new TextEncoder() : new Se.TextEncoder(), be = `\r
`, Lc = Ie.encode(be), Bc = 2;
class Nc {
  constructor(e, n) {
    const { escapeName: t } = this.constructor, i = m.isString(n);
    let s = `Content-Disposition: form-data; name="${t(e)}"${!i && n.name ? `; filename="${t(n.name)}"` : ""}${be}`;
    i ? n = Ie.encode(String(n).replace(/\r?\n|\r\n?/g, be)) : s += `Content-Type: ${n.type || "application/octet-stream"}${be}`, this.headers = Ie.encode(s + be), this.contentLength = i ? n.byteLength : n.size, this.size = this.headers.byteLength + this.contentLength + Bc, this.name = e, this.value = n;
  }
  async *encode() {
    yield this.headers;
    const { value: e } = this;
    m.isTypedArray(e) ? yield e : yield* ki(e), yield Lc;
  }
  static escapeName(e) {
    return String(e).replace(/[\r\n"]/g, (n) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[n]);
  }
}
const zc = (a, e, n) => {
  const {
    tag: t = "form-data-boundary",
    size: i = 25,
    boundary: s = t + "-" + F.generateString(i, qc)
  } = n || {};
  if (!m.isFormData(a))
    throw TypeError("FormData instance required");
  if (s.length < 1 || s.length > 70)
    throw Error("boundary must be 10-70 characters long");
  const o = Ie.encode("--" + s + be), r = Ie.encode("--" + s + "--" + be);
  let p = r.byteLength;
  const d = Array.from(a.entries()).map(([l, u]) => {
    const x = new Nc(l, u);
    return p += x.size, x;
  });
  p += o.byteLength * d.length, p = m.toFiniteNumber(p);
  const c = {
    "Content-Type": `multipart/form-data; boundary=${s}`
  };
  return Number.isFinite(p) && (c["Content-Length"] = p), e && e(c), Gi.from(async function* () {
    for (const l of d)
      yield o, yield* l.encode();
    yield r;
  }());
};
class Ic extends W.Transform {
  __transform(e, n, t) {
    this.push(e), t();
  }
  _transform(e, n, t) {
    if (e.length !== 0 && (this._transform = this.__transform, e[0] !== 120)) {
      const i = Buffer.alloc(2);
      i[0] = 120, i[1] = 156, this.push(i, n);
    }
    this.__transform(e, n, t);
  }
}
const $c = (a, e) => m.isAsyncFn(a) ? function(...n) {
  const t = n.pop();
  a.apply(this, n).then((i) => {
    try {
      e ? t(null, ...e(i)) : t(null, i);
    } catch (s) {
      t(s);
    }
  }, t);
} : a;
function Dc(a, e) {
  a = a || 10;
  const n = new Array(a), t = new Array(a);
  let i = 0, s = 0, o;
  return e = e !== void 0 ? e : 1e3, function(p) {
    const d = Date.now(), c = t[s];
    o || (o = d), n[i] = p, t[i] = d;
    let l = s, u = 0;
    for (; l !== i; )
      u += n[l++], l = l % a;
    if (i = (i + 1) % a, i === s && (s = (s + 1) % a), d - o < e)
      return;
    const x = c && d - c;
    return x ? Math.round(u * 1e3 / x) : void 0;
  };
}
function Mc(a, e) {
  let n = 0, t = 1e3 / e, i, s;
  const o = (d, c = Date.now()) => {
    n = c, i = null, s && (clearTimeout(s), s = null), a(...d);
  };
  return [(...d) => {
    const c = Date.now(), l = c - n;
    l >= t ? o(d, c) : (i = d, s || (s = setTimeout(() => {
      s = null, o(i);
    }, t - l)));
  }, () => i && o(i)];
}
const Fe = (a, e, n = 3) => {
  let t = 0;
  const i = Dc(50, 250);
  return Mc((s) => {
    const o = s.loaded, r = s.lengthComputable ? s.total : void 0, p = o - t, d = i(p), c = o <= r;
    t = o;
    const l = {
      loaded: o,
      total: r,
      progress: r ? o / r : void 0,
      bytes: p,
      rate: d || void 0,
      estimated: d && r && c ? (r - o) / d : void 0,
      event: s,
      lengthComputable: r != null,
      [e ? "download" : "upload"]: !0
    };
    a(l);
  }, n);
}, la = (a, e) => {
  const n = a != null;
  return [(t) => e[0]({
    lengthComputable: n,
    total: a,
    loaded: t
  }), e[1]];
}, ua = (a) => (...e) => m.asap(() => a(...e));
function Hc(a) {
  if (!a || typeof a != "string" || !a.startsWith("data:")) return 0;
  const e = a.indexOf(",");
  if (e < 0) return 0;
  const n = a.slice(5, e), t = a.slice(e + 1);
  if (/;base64/i.test(n)) {
    let s = t.length;
    const o = t.length;
    for (let u = 0; u < o; u++)
      if (t.charCodeAt(u) === 37 && u + 2 < o) {
        const x = t.charCodeAt(u + 1), f = t.charCodeAt(u + 2);
        (x >= 48 && x <= 57 || x >= 65 && x <= 70 || x >= 97 && x <= 102) && (f >= 48 && f <= 57 || f >= 65 && f <= 70 || f >= 97 && f <= 102) && (s -= 2, u += 2);
      }
    let r = 0, p = o - 1;
    const d = (u) => u >= 2 && t.charCodeAt(u - 2) === 37 && // '%'
    t.charCodeAt(u - 1) === 51 && // '3'
    (t.charCodeAt(u) === 68 || t.charCodeAt(u) === 100);
    p >= 0 && (t.charCodeAt(p) === 61 ? (r++, p--) : d(p) && (r++, p -= 3)), r === 1 && p >= 0 && (t.charCodeAt(p) === 61 || d(p)) && r++;
    const l = Math.floor(s / 4) * 3 - (r || 0);
    return l > 0 ? l : 0;
  }
  return Buffer.byteLength(t, "utf8");
}
const ft = {
  flush: ue.constants.Z_SYNC_FLUSH,
  finishFlush: ue.constants.Z_SYNC_FLUSH
}, Gc = {
  flush: ue.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: ue.constants.BROTLI_OPERATION_FLUSH
}, xt = m.isFunction(ue.createBrotliDecompress), { http: Wc, https: Vc } = Pc, Jc = /https:?/, ht = F.protocols.map((a) => a + ":"), vt = (a, [e, n]) => (a.on("end", n).on("error", n), e);
class Kc {
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(e, n) {
    n = Object.assign({
      sessionTimeout: 1e3
    }, n);
    let t = this.sessions[e];
    if (t) {
      let c = t.length;
      for (let l = 0; l < c; l++) {
        const [u, x] = t[l];
        if (!u.destroyed && !u.closed && Se.isDeepStrictEqual(x, n))
          return u;
      }
    }
    const i = Pt.connect(e, n);
    let s;
    const o = () => {
      if (s)
        return;
      s = !0;
      let c = t, l = c.length, u = l;
      for (; u--; )
        if (c[u][0] === i) {
          l === 1 ? delete this.sessions[e] : c.splice(u, 1);
          return;
        }
    }, r = i.request, { sessionTimeout: p } = n;
    if (p != null) {
      let c, l = 0;
      i.request = function() {
        const u = r.apply(this, arguments);
        return l++, c && (clearTimeout(c), c = null), u.once("close", () => {
          --l || (c = setTimeout(() => {
            c = null, o();
          }, p));
        }), u;
      };
    }
    i.once("close", o);
    let d = [
      i,
      n
    ];
    return t ? t.push(d) : t = this.sessions[e] = [d], i;
  }
}
const Xc = new Kc();
function Yc(a, e) {
  a.beforeRedirects.proxy && a.beforeRedirects.proxy(a), a.beforeRedirects.config && a.beforeRedirects.config(a, e);
}
function Si(a, e, n) {
  let t = e;
  if (!t && t !== !1) {
    const i = hi.getProxyForUrl(n);
    i && (t = new URL(i));
  }
  if (t) {
    if (t.username && (t.auth = (t.username || "") + ":" + (t.password || "")), t.auth) {
      (t.auth.username || t.auth.password) && (t.auth = (t.auth.username || "") + ":" + (t.auth.password || ""));
      const s = Buffer.from(t.auth, "utf8").toString("base64");
      a.headers["Proxy-Authorization"] = "Basic " + s;
    }
    a.headers.host = a.hostname + (a.port ? ":" + a.port : "");
    const i = t.hostname || t.host;
    a.hostname = i, a.host = i, a.port = t.port, a.path = n, t.protocol && (a.protocol = t.protocol.includes(":") ? t.protocol : `${t.protocol}:`);
  }
  a.beforeRedirects.proxy = function(s) {
    Si(s, e, s.href);
  };
}
const Zc = typeof process < "u" && m.kindOf(process) === "process", Qc = (a) => new Promise((e, n) => {
  let t, i;
  const s = (p, d) => {
    i || (i = !0, t && t(p, d));
  }, o = (p) => {
    s(p), e(p);
  }, r = (p) => {
    s(p, !0), n(p);
  };
  a(o, r, (p) => t = p).catch(r);
}), ep = ({ address: a, family: e }) => {
  if (!m.isString(a))
    throw TypeError("address must be a string");
  return {
    address: a,
    family: e || (a.indexOf(".") < 0 ? 6 : 4)
  };
}, bt = (a, e) => ep(m.isObject(a) ? a : { address: a, family: e }), ap = {
  request(a, e) {
    const n = a.protocol + "//" + a.hostname + ":" + (a.port || 80), { http2Options: t, headers: i } = a, s = Xc.getSession(n, t), {
      HTTP2_HEADER_SCHEME: o,
      HTTP2_HEADER_METHOD: r,
      HTTP2_HEADER_PATH: p,
      HTTP2_HEADER_STATUS: d
    } = Pt.constants, c = {
      [o]: a.protocol.replace(":", ""),
      [r]: a.method,
      [p]: a.path
    };
    m.forEach(i, (u, x) => {
      x.charAt(0) !== ":" && (c[x] = u);
    });
    const l = s.request(c);
    return l.once("response", (u) => {
      const x = l;
      u = Object.assign({}, u);
      const f = u[d];
      delete u[d], x.headers = u, x.statusCode = +f, e(x);
    }), l;
  }
}, np = Zc && function(e) {
  return Qc(async function(t, i, s) {
    let { data: o, lookup: r, family: p, httpVersion: d = 1, http2Options: c } = e;
    const { responseType: l, responseEncoding: u } = e, x = e.method.toUpperCase();
    let f, v = !1, h;
    if (d = +d, Number.isNaN(d))
      throw TypeError(`Invalid protocol version: '${e.httpVersion}' is not a number`);
    if (d !== 1 && d !== 2)
      throw TypeError(`Unsupported protocol version '${d}'`);
    const b = d === 2;
    if (r) {
      const S = $c(r, (y) => m.isArray(y) ? y : [y]);
      r = (y, j, Y) => {
        S(y, j, (q, Q, le) => {
          if (q)
            return Y(q);
          const G = m.isArray(Q) ? Q.map((Ke) => bt(Ke)) : [bt(Q, le)];
          j.all ? Y(q, G) : Y(q, G[0].address, G[0].family);
        });
      };
    }
    const w = new Ki();
    function k(S) {
      try {
        w.emit("abort", !S || S.type ? new fe(null, e, h) : S);
      } catch (y) {
        console.warn("emit error", y);
      }
    }
    w.once("abort", i);
    const T = () => {
      e.cancelToken && e.cancelToken.unsubscribe(k), e.signal && e.signal.removeEventListener("abort", k), w.removeAllListeners();
    };
    (e.cancelToken || e.signal) && (e.cancelToken && e.cancelToken.subscribe(k), e.signal && (e.signal.aborted ? k() : e.signal.addEventListener("abort", k))), s((S, y) => {
      if (f = !0, y) {
        v = !0, T();
        return;
      }
      const { data: j } = S;
      if (j instanceof W.Readable || j instanceof W.Duplex) {
        const Y = W.finished(j, () => {
          Y(), T();
        });
      } else
        T();
    });
    const B = bn(e.baseURL, e.url, e.allowAbsoluteUrls), O = new URL(B, F.hasBrowserEnv ? F.origin : void 0), P = O.protocol || ht[0];
    if (P === "data:") {
      if (e.maxContentLength > -1) {
        const y = String(e.url || B || "");
        if (Hc(y) > e.maxContentLength)
          return i(new g(
            "maxContentLength size of " + e.maxContentLength + " exceeded",
            g.ERR_BAD_RESPONSE,
            e
          ));
      }
      let S;
      if (x !== "GET")
        return Ae(t, i, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config: e
        });
      try {
        S = Uc(e.url, l === "blob", {
          Blob: e.env && e.env.Blob
        });
      } catch (y) {
        throw g.from(y, g.ERR_BAD_REQUEST, e);
      }
      return l === "text" ? (S = S.toString(u), (!u || u === "utf8") && (S = m.stripBOM(S))) : l === "stream" && (S = W.Readable.from(S)), Ae(t, i, {
        data: S,
        status: 200,
        statusText: "OK",
        headers: new $(),
        config: e
      });
    }
    if (ht.indexOf(P) === -1)
      return i(new g(
        "Unsupported protocol " + P,
        g.ERR_BAD_REQUEST,
        e
      ));
    const N = $.from(e.headers).normalize();
    N.set("User-Agent", "axios/" + pa, !1);
    const { onUploadProgress: Z, onDownloadProgress: ce } = e, xe = e.maxRate;
    let oe, te;
    if (m.isSpecCompliantForm(o)) {
      const S = N.getContentType(/boundary=([-_\w\d]{10,70})/i);
      o = zc(o, (y) => {
        N.set(y);
      }, {
        tag: `axios-${pa}-boundary`,
        boundary: S && S[1] || void 0
      });
    } else if (m.isFormData(o) && m.isFunction(o.getHeaders)) {
      if (N.set(o.getHeaders()), !N.hasContentLength())
        try {
          const S = await Se.promisify(o.getLength).call(o);
          Number.isFinite(S) && S >= 0 && N.setContentLength(S);
        } catch {
        }
    } else if (m.isBlob(o) || m.isFile(o))
      o.size && N.setContentType(o.type || "application/octet-stream"), N.setContentLength(o.size || 0), o = W.Readable.from(ki(o));
    else if (o && !m.isStream(o)) {
      if (!Buffer.isBuffer(o)) if (m.isArrayBuffer(o))
        o = Buffer.from(new Uint8Array(o));
      else if (m.isString(o))
        o = Buffer.from(o, "utf-8");
      else
        return i(new g(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          g.ERR_BAD_REQUEST,
          e
        ));
      if (N.setContentLength(o.length, !1), e.maxBodyLength > -1 && o.length > e.maxBodyLength)
        return i(new g(
          "Request body larger than maxBodyLength limit",
          g.ERR_BAD_REQUEST,
          e
        ));
    }
    const re = m.toFiniteNumber(N.getContentLength());
    m.isArray(xe) ? (oe = xe[0], te = xe[1]) : oe = te = xe, o && (Z || oe) && (m.isStream(o) || (o = W.Readable.from(o, { objectMode: !1 })), o = W.pipeline([o, new dt({
      maxRate: m.toFiniteNumber(oe)
    })], m.noop), Z && o.on("progress", vt(
      o,
      la(
        re,
        Fe(ua(Z), !1, 3)
      )
    )));
    let pe;
    if (e.auth) {
      const S = e.auth.username || "", y = e.auth.password || "";
      pe = S + ":" + y;
    }
    if (!pe && O.username) {
      const S = O.username, y = O.password;
      pe = S + ":" + y;
    }
    pe && N.delete("authorization");
    let X;
    try {
      X = xn(
        O.pathname + O.search,
        e.params,
        e.paramsSerializer
      ).replace(/^\?/, "");
    } catch (S) {
      const y = new Error(S.message);
      return y.config = e, y.url = e.url, y.exists = !0, i(y);
    }
    N.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (xt ? ", br" : ""),
      !1
    );
    const I = {
      path: X,
      method: x,
      headers: N.toJSON(),
      agents: { http: e.httpAgent, https: e.httpsAgent },
      auth: pe,
      protocol: P,
      family: p,
      beforeRedirect: Yc,
      beforeRedirects: {},
      http2Options: c
    };
    !m.isUndefined(r) && (I.lookup = r), e.socketPath ? I.socketPath = e.socketPath : (I.hostname = O.hostname.startsWith("[") ? O.hostname.slice(1, -1) : O.hostname, I.port = O.port, Si(I, e.proxy, P + "//" + O.hostname + (O.port ? ":" + O.port : "") + I.path));
    let H;
    const Ce = Jc.test(I.protocol);
    if (I.agent = Ce ? e.httpsAgent : e.httpAgent, b ? H = ap : e.transport ? H = e.transport : e.maxRedirects === 0 ? H = Ce ? pn : cn : (e.maxRedirects && (I.maxRedirects = e.maxRedirects), e.beforeRedirect && (I.beforeRedirects.config = e.beforeRedirect), H = Ce ? Vc : Wc), e.maxBodyLength > -1 ? I.maxBodyLength = e.maxBodyLength : I.maxBodyLength = 1 / 0, e.insecureHTTPParser && (I.insecureHTTPParser = e.insecureHTTPParser), h = H.request(I, function(y) {
      if (h.destroyed) return;
      const j = [y], Y = m.toFiniteNumber(y.headers["content-length"]);
      if (ce || te) {
        const G = new dt({
          maxRate: m.toFiniteNumber(te)
        });
        ce && G.on("progress", vt(
          G,
          la(
            Y,
            Fe(ua(ce), !0, 3)
          )
        )), j.push(G);
      }
      let q = y;
      const Q = y.req || h;
      if (e.decompress !== !1 && y.headers["content-encoding"])
        switch ((x === "HEAD" || y.statusCode === 204) && delete y.headers["content-encoding"], (y.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            j.push(ue.createUnzip(ft)), delete y.headers["content-encoding"];
            break;
          case "deflate":
            j.push(new Ic()), j.push(ue.createUnzip(ft)), delete y.headers["content-encoding"];
            break;
          case "br":
            xt && (j.push(ue.createBrotliDecompress(Gc)), delete y.headers["content-encoding"]);
        }
      q = j.length > 1 ? W.pipeline(j, m.noop) : j[0];
      const le = {
        status: y.statusCode,
        statusText: y.statusMessage,
        headers: new $(y.headers),
        config: e,
        request: Q
      };
      if (l === "stream")
        le.data = q, Ae(t, i, le);
      else {
        const G = [];
        let Ke = 0;
        q.on("data", function(M) {
          G.push(M), Ke += M.length, e.maxContentLength > -1 && Ke > e.maxContentLength && (v = !0, q.destroy(), k(new g(
            "maxContentLength size of " + e.maxContentLength + " exceeded",
            g.ERR_BAD_RESPONSE,
            e,
            Q
          )));
        }), q.on("aborted", function() {
          if (v)
            return;
          const M = new g(
            "stream has been aborted",
            g.ERR_BAD_RESPONSE,
            e,
            Q
          );
          q.destroy(M), i(M);
        }), q.on("error", function(M) {
          h.destroyed || i(g.from(M, null, e, Q));
        }), q.on("end", function() {
          try {
            let M = G.length === 1 ? G[0] : Buffer.concat(G);
            l !== "arraybuffer" && (M = M.toString(u), (!u || u === "utf8") && (M = m.stripBOM(M))), le.data = M;
          } catch (M) {
            return i(g.from(M, null, e, le.request, le));
          }
          Ae(t, i, le);
        });
      }
      w.once("abort", (G) => {
        q.destroyed || (q.emit("error", G), q.destroy());
      });
    }), w.once("abort", (S) => {
      h.close ? h.close() : h.destroy(S);
    }), h.on("error", function(y) {
      i(g.from(y, null, e, h));
    }), h.on("socket", function(y) {
      y.setKeepAlive(!0, 1e3 * 60);
    }), e.timeout) {
      const S = parseInt(e.timeout, 10);
      if (Number.isNaN(S)) {
        k(new g(
          "error trying to parse `config.timeout` to int",
          g.ERR_BAD_OPTION_VALUE,
          e,
          h
        ));
        return;
      }
      h.setTimeout(S, function() {
        if (f) return;
        let j = e.timeout ? "timeout of " + e.timeout + "ms exceeded" : "timeout exceeded";
        const Y = e.transitional || hn;
        e.timeoutErrorMessage && (j = e.timeoutErrorMessage), k(new g(
          j,
          Y.clarifyTimeoutError ? g.ETIMEDOUT : g.ECONNABORTED,
          e,
          h
        ));
      });
    } else
      h.setTimeout(0);
    if (m.isStream(o)) {
      let S = !1, y = !1;
      o.on("end", () => {
        S = !0;
      }), o.once("error", (j) => {
        y = !0, h.destroy(j);
      }), o.on("close", () => {
        !S && !y && k(new fe("Request stream has been aborted", e, h));
      }), o.pipe(h);
    } else
      o && h.write(o), h.end();
  });
}, tp = F.hasStandardBrowserEnv ? /* @__PURE__ */ ((a, e) => (n) => (n = new URL(n, F.origin), a.protocol === n.protocol && a.host === n.host && (e || a.port === n.port)))(
  new URL(F.origin),
  F.navigator && /(msie|trident)/i.test(F.navigator.userAgent)
) : () => !0, ip = F.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(a, e, n, t, i, s, o) {
      if (typeof document > "u") return;
      const r = [`${a}=${encodeURIComponent(e)}`];
      m.isNumber(n) && r.push(`expires=${new Date(n).toUTCString()}`), m.isString(t) && r.push(`path=${t}`), m.isString(i) && r.push(`domain=${i}`), s === !0 && r.push("secure"), m.isString(o) && r.push(`SameSite=${o}`), document.cookie = r.join("; ");
    },
    read(a) {
      if (typeof document > "u") return null;
      const e = document.cookie.match(new RegExp("(?:^|; )" + a + "=([^;]*)"));
      return e ? decodeURIComponent(e[1]) : null;
    },
    remove(a) {
      this.write(a, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
), gt = (a) => a instanceof $ ? { ...a } : a;
function ke(a, e) {
  e = e || {};
  const n = {};
  function t(d, c, l, u) {
    return m.isPlainObject(d) && m.isPlainObject(c) ? m.merge.call({ caseless: u }, d, c) : m.isPlainObject(c) ? m.merge({}, c) : m.isArray(c) ? c.slice() : c;
  }
  function i(d, c, l, u) {
    if (m.isUndefined(c)) {
      if (!m.isUndefined(d))
        return t(void 0, d, l, u);
    } else return t(d, c, l, u);
  }
  function s(d, c) {
    if (!m.isUndefined(c))
      return t(void 0, c);
  }
  function o(d, c) {
    if (m.isUndefined(c)) {
      if (!m.isUndefined(d))
        return t(void 0, d);
    } else return t(void 0, c);
  }
  function r(d, c, l) {
    if (l in e)
      return t(d, c);
    if (l in a)
      return t(void 0, d);
  }
  const p = {
    url: s,
    method: s,
    data: s,
    baseURL: o,
    transformRequest: o,
    transformResponse: o,
    paramsSerializer: o,
    timeout: o,
    timeoutMessage: o,
    withCredentials: o,
    withXSRFToken: o,
    adapter: o,
    responseType: o,
    xsrfCookieName: o,
    xsrfHeaderName: o,
    onUploadProgress: o,
    onDownloadProgress: o,
    decompress: o,
    maxContentLength: o,
    maxBodyLength: o,
    beforeRedirect: o,
    transport: o,
    httpAgent: o,
    httpsAgent: o,
    cancelToken: o,
    socketPath: o,
    responseEncoding: o,
    validateStatus: r,
    headers: (d, c, l) => i(gt(d), gt(c), l, !0)
  };
  return m.forEach(Object.keys({ ...a, ...e }), function(c) {
    const l = p[c] || i, u = l(a[c], e[c], c);
    m.isUndefined(u) && l !== r || (n[c] = u);
  }), n;
}
const Ci = (a) => {
  const e = ke({}, a);
  let { data: n, withXSRFToken: t, xsrfHeaderName: i, xsrfCookieName: s, headers: o, auth: r } = e;
  if (e.headers = o = $.from(o), e.url = xn(bn(e.baseURL, e.url, e.allowAbsoluteUrls), a.params, a.paramsSerializer), r && o.set(
    "Authorization",
    "Basic " + btoa((r.username || "") + ":" + (r.password ? unescape(encodeURIComponent(r.password)) : ""))
  ), m.isFormData(n)) {
    if (F.hasStandardBrowserEnv || F.hasStandardBrowserWebWorkerEnv)
      o.setContentType(void 0);
    else if (m.isFunction(n.getHeaders)) {
      const p = n.getHeaders(), d = ["content-type", "content-length"];
      Object.entries(p).forEach(([c, l]) => {
        d.includes(c.toLowerCase()) && o.set(c, l);
      });
    }
  }
  if (F.hasStandardBrowserEnv && (t && m.isFunction(t) && (t = t(e)), t || t !== !1 && tp(e.url))) {
    const p = i && s && ip.read(s);
    p && o.set(i, p);
  }
  return e;
}, sp = typeof XMLHttpRequest < "u", op = sp && function(a) {
  return new Promise(function(n, t) {
    const i = Ci(a);
    let s = i.data;
    const o = $.from(i.headers).normalize();
    let { responseType: r, onUploadProgress: p, onDownloadProgress: d } = i, c, l, u, x, f;
    function v() {
      x && x(), f && f(), i.cancelToken && i.cancelToken.unsubscribe(c), i.signal && i.signal.removeEventListener("abort", c);
    }
    let h = new XMLHttpRequest();
    h.open(i.method.toUpperCase(), i.url, !0), h.timeout = i.timeout;
    function b() {
      if (!h)
        return;
      const k = $.from(
        "getAllResponseHeaders" in h && h.getAllResponseHeaders()
      ), B = {
        data: !r || r === "text" || r === "json" ? h.responseText : h.response,
        status: h.status,
        statusText: h.statusText,
        headers: k,
        config: a,
        request: h
      };
      Ae(function(P) {
        n(P), v();
      }, function(P) {
        t(P), v();
      }, B), h = null;
    }
    "onloadend" in h ? h.onloadend = b : h.onreadystatechange = function() {
      !h || h.readyState !== 4 || h.status === 0 && !(h.responseURL && h.responseURL.indexOf("file:") === 0) || setTimeout(b);
    }, h.onabort = function() {
      h && (t(new g("Request aborted", g.ECONNABORTED, a, h)), h = null);
    }, h.onerror = function(T) {
      const B = T && T.message ? T.message : "Network Error", O = new g(B, g.ERR_NETWORK, a, h);
      O.event = T || null, t(O), h = null;
    }, h.ontimeout = function() {
      let T = i.timeout ? "timeout of " + i.timeout + "ms exceeded" : "timeout exceeded";
      const B = i.transitional || hn;
      i.timeoutErrorMessage && (T = i.timeoutErrorMessage), t(new g(
        T,
        B.clarifyTimeoutError ? g.ETIMEDOUT : g.ECONNABORTED,
        a,
        h
      )), h = null;
    }, s === void 0 && o.setContentType(null), "setRequestHeader" in h && m.forEach(o.toJSON(), function(T, B) {
      h.setRequestHeader(B, T);
    }), m.isUndefined(i.withCredentials) || (h.withCredentials = !!i.withCredentials), r && r !== "json" && (h.responseType = i.responseType), d && ([u, f] = Fe(d, !0), h.addEventListener("progress", u)), p && h.upload && ([l, x] = Fe(p), h.upload.addEventListener("progress", l), h.upload.addEventListener("loadend", x)), (i.cancelToken || i.signal) && (c = (k) => {
      h && (t(!k || k.type ? new fe(null, a, h) : k), h.abort(), h = null);
    }, i.cancelToken && i.cancelToken.subscribe(c), i.signal && (i.signal.aborted ? c() : i.signal.addEventListener("abort", c)));
    const w = _i(i.url);
    if (w && F.protocols.indexOf(w) === -1) {
      t(new g("Unsupported protocol " + w + ":", g.ERR_BAD_REQUEST, a));
      return;
    }
    h.send(s || null);
  });
}, rp = (a, e) => {
  const { length: n } = a = a ? a.filter(Boolean) : [];
  if (e || n) {
    let t = new AbortController(), i;
    const s = function(d) {
      if (!i) {
        i = !0, r();
        const c = d instanceof Error ? d : this.reason;
        t.abort(c instanceof g ? c : new fe(c instanceof Error ? c.message : c));
      }
    };
    let o = e && setTimeout(() => {
      o = null, s(new g(`timeout ${e} of ms exceeded`, g.ETIMEDOUT));
    }, e);
    const r = () => {
      a && (o && clearTimeout(o), o = null, a.forEach((d) => {
        d.unsubscribe ? d.unsubscribe(s) : d.removeEventListener("abort", s);
      }), a = null);
    };
    a.forEach((d) => d.addEventListener("abort", s));
    const { signal: p } = t;
    return p.unsubscribe = () => m.asap(r), p;
  }
}, cp = function* (a, e) {
  let n = a.byteLength;
  if (n < e) {
    yield a;
    return;
  }
  let t = 0, i;
  for (; t < n; )
    i = t + e, yield a.slice(t, i), t = i;
}, pp = async function* (a, e) {
  for await (const n of lp(a))
    yield* cp(n, e);
}, lp = async function* (a) {
  if (a[Symbol.asyncIterator]) {
    yield* a;
    return;
  }
  const e = a.getReader();
  try {
    for (; ; ) {
      const { done: n, value: t } = await e.read();
      if (n)
        break;
      yield t;
    }
  } finally {
    await e.cancel();
  }
}, yt = (a, e, n, t) => {
  const i = pp(a, e);
  let s = 0, o, r = (p) => {
    o || (o = !0, t && t(p));
  };
  return new ReadableStream({
    async pull(p) {
      try {
        const { done: d, value: c } = await i.next();
        if (d) {
          r(), p.close();
          return;
        }
        let l = c.byteLength;
        if (n) {
          let u = s += l;
          n(u);
        }
        p.enqueue(new Uint8Array(c));
      } catch (d) {
        throw r(d), d;
      }
    },
    cancel(p) {
      return r(p), i.return();
    }
  }, {
    highWaterMark: 2
  });
}, wt = 64 * 1024, { isFunction: ea } = m, up = (({ Request: a, Response: e }) => ({
  Request: a,
  Response: e
}))(m.global), {
  ReadableStream: _t,
  TextEncoder: kt
} = m.global, St = (a, ...e) => {
  try {
    return !!a(...e);
  } catch {
    return !1;
  }
}, dp = (a) => {
  a = m.merge.call({
    skipUndefined: !0
  }, up, a);
  const { fetch: e, Request: n, Response: t } = a, i = e ? ea(e) : typeof fetch == "function", s = ea(n), o = ea(t);
  if (!i)
    return !1;
  const r = i && ea(_t), p = i && (typeof kt == "function" ? /* @__PURE__ */ ((f) => (v) => f.encode(v))(new kt()) : async (f) => new Uint8Array(await new n(f).arrayBuffer())), d = s && r && St(() => {
    let f = !1;
    const v = new n(F.origin, {
      body: new _t(),
      method: "POST",
      get duplex() {
        return f = !0, "half";
      }
    }).headers.has("Content-Type");
    return f && !v;
  }), c = o && r && St(() => m.isReadableStream(new t("").body)), l = {
    stream: c && ((f) => f.body)
  };
  i && ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((f) => {
    !l[f] && (l[f] = (v, h) => {
      let b = v && v[f];
      if (b)
        return b.call(v);
      throw new g(`Response type '${f}' is not supported`, g.ERR_NOT_SUPPORT, h);
    });
  });
  const u = async (f) => {
    if (f == null)
      return 0;
    if (m.isBlob(f))
      return f.size;
    if (m.isSpecCompliantForm(f))
      return (await new n(F.origin, {
        method: "POST",
        body: f
      }).arrayBuffer()).byteLength;
    if (m.isArrayBufferView(f) || m.isArrayBuffer(f))
      return f.byteLength;
    if (m.isURLSearchParams(f) && (f = f + ""), m.isString(f))
      return (await p(f)).byteLength;
  }, x = async (f, v) => {
    const h = m.toFiniteNumber(f.getContentLength());
    return h ?? u(v);
  };
  return async (f) => {
    let {
      url: v,
      method: h,
      data: b,
      signal: w,
      cancelToken: k,
      timeout: T,
      onDownloadProgress: B,
      onUploadProgress: O,
      responseType: P,
      headers: N,
      withCredentials: Z = "same-origin",
      fetchOptions: ce
    } = Ci(f), xe = e || fetch;
    P = P ? (P + "").toLowerCase() : "text";
    let oe = rp([w, k && k.toAbortSignal()], T), te = null;
    const re = oe && oe.unsubscribe && (() => {
      oe.unsubscribe();
    });
    let pe;
    try {
      if (O && d && h !== "get" && h !== "head" && (pe = await x(N, b)) !== 0) {
        let y = new n(v, {
          method: "POST",
          body: b,
          duplex: "half"
        }), j;
        if (m.isFormData(b) && (j = y.headers.get("content-type")) && N.setContentType(j), y.body) {
          const [Y, q] = la(
            pe,
            Fe(ua(O))
          );
          b = yt(y.body, wt, Y, q);
        }
      }
      m.isString(Z) || (Z = Z ? "include" : "omit");
      const X = s && "credentials" in n.prototype, I = {
        ...ce,
        signal: oe,
        method: h.toUpperCase(),
        headers: N.normalize().toJSON(),
        body: b,
        duplex: "half",
        credentials: X ? Z : void 0
      };
      te = s && new n(v, I);
      let H = await (s ? xe(te, ce) : xe(v, I));
      const Ce = c && (P === "stream" || P === "response");
      if (c && (B || Ce && re)) {
        const y = {};
        ["status", "statusText", "headers"].forEach((Q) => {
          y[Q] = H[Q];
        });
        const j = m.toFiniteNumber(H.headers.get("content-length")), [Y, q] = B && la(
          j,
          Fe(ua(B), !0)
        ) || [];
        H = new t(
          yt(H.body, wt, Y, () => {
            q && q(), re && re();
          }),
          y
        );
      }
      P = P || "text";
      let S = await l[m.findKey(l, P) || "text"](H, f);
      return !Ce && re && re(), await new Promise((y, j) => {
        Ae(y, j, {
          data: S,
          headers: $.from(H.headers),
          status: H.status,
          statusText: H.statusText,
          config: f,
          request: te
        });
      });
    } catch (X) {
      throw re && re(), X && X.name === "TypeError" && /Load failed|fetch/i.test(X.message) ? Object.assign(
        new g("Network Error", g.ERR_NETWORK, f, te),
        {
          cause: X.cause || X
        }
      ) : g.from(X, X && X.code, f, te);
    }
  };
}, mp = /* @__PURE__ */ new Map(), Ei = (a) => {
  let e = a && a.env || {};
  const { fetch: n, Request: t, Response: i } = e, s = [
    t,
    i,
    n
  ];
  let o = s.length, r = o, p, d, c = mp;
  for (; r--; )
    p = s[r], d = c.get(p), d === void 0 && c.set(p, d = r ? /* @__PURE__ */ new Map() : dp(e)), c = d;
  return d;
};
Ei();
const Rn = {
  http: np,
  xhr: op,
  fetch: {
    get: Ei
  }
};
m.forEach(Rn, (a, e) => {
  if (a) {
    try {
      Object.defineProperty(a, "name", { value: e });
    } catch {
    }
    Object.defineProperty(a, "adapterName", { value: e });
  }
});
const Ct = (a) => `- ${a}`, fp = (a) => m.isFunction(a) || a === null || a === !1;
function xp(a, e) {
  a = m.isArray(a) ? a : [a];
  const { length: n } = a;
  let t, i;
  const s = {};
  for (let o = 0; o < n; o++) {
    t = a[o];
    let r;
    if (i = t, !fp(t) && (i = Rn[(r = String(t)).toLowerCase()], i === void 0))
      throw new g(`Unknown adapter '${r}'`);
    if (i && (m.isFunction(i) || (i = i.get(e))))
      break;
    s[r || "#" + o] = i;
  }
  if (!i) {
    const o = Object.entries(s).map(
      ([p, d]) => `adapter ${p} ` + (d === !1 ? "is not supported by the environment" : "is not available in the build")
    );
    let r = n ? o.length > 1 ? `since :
` + o.map(Ct).join(`
`) : " " + Ct(o[0]) : "as no adapter specified";
    throw new g(
      "There is no suitable adapter to dispatch the request " + r,
      "ERR_NOT_SUPPORT"
    );
  }
  return i;
}
const Ri = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: xp,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: Rn
};
function Xa(a) {
  if (a.cancelToken && a.cancelToken.throwIfRequested(), a.signal && a.signal.aborted)
    throw new fe(null, a);
}
function Et(a) {
  return Xa(a), a.headers = $.from(a.headers), a.data = Ma.call(
    a,
    a.transformRequest
  ), ["post", "put", "patch"].indexOf(a.method) !== -1 && a.headers.setContentType("application/x-www-form-urlencoded", !1), Ri.getAdapter(a.adapter || We.adapter, a)(a).then(function(t) {
    return Xa(a), t.data = Ma.call(
      a,
      a.transformResponse,
      t
    ), t.headers = $.from(t.headers), t;
  }, function(t) {
    return xi(t) || (Xa(a), t && t.response && (t.response.data = Ma.call(
      a,
      a.transformResponse,
      t.response
    ), t.response.headers = $.from(t.response.headers))), Promise.reject(t);
  });
}
const ya = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((a, e) => {
  ya[a] = function(t) {
    return typeof t === a || "a" + (e < 1 ? "n " : " ") + a;
  };
});
const Rt = {};
ya.transitional = function(e, n, t) {
  function i(s, o) {
    return "[Axios v" + pa + "] Transitional option '" + s + "'" + o + (t ? ". " + t : "");
  }
  return (s, o, r) => {
    if (e === !1)
      throw new g(
        i(o, " has been removed" + (n ? " in " + n : "")),
        g.ERR_DEPRECATED
      );
    return n && !Rt[o] && (Rt[o] = !0, console.warn(
      i(
        o,
        " has been deprecated since v" + n + " and will be removed in the near future"
      )
    )), e ? e(s, o, r) : !0;
  };
};
ya.spelling = function(e) {
  return (n, t) => (console.warn(`${t} is likely a misspelling of ${e}`), !0);
};
function hp(a, e, n) {
  if (typeof a != "object")
    throw new g("options must be an object", g.ERR_BAD_OPTION_VALUE);
  const t = Object.keys(a);
  let i = t.length;
  for (; i-- > 0; ) {
    const s = t[i], o = e[s];
    if (o) {
      const r = a[s], p = r === void 0 || o(r, s, a);
      if (p !== !0)
        throw new g("option " + s + " must be " + p, g.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (n !== !0)
      throw new g("Unknown option " + s, g.ERR_BAD_OPTION);
  }
}
const oa = {
  assertOptions: hp,
  validators: ya
}, ie = oa.validators;
let we = class {
  constructor(e) {
    this.defaults = e || {}, this.interceptors = {
      request: new nt(),
      response: new nt()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(e, n) {
    try {
      return await this._request(e, n);
    } catch (t) {
      if (t instanceof Error) {
        let i = {};
        Error.captureStackTrace ? Error.captureStackTrace(i) : i = new Error();
        const s = i.stack ? i.stack.replace(/^.+\n/, "") : "";
        try {
          t.stack ? s && !String(t.stack).endsWith(s.replace(/^.+\n.+\n/, "")) && (t.stack += `
` + s) : t.stack = s;
        } catch {
        }
      }
      throw t;
    }
  }
  _request(e, n) {
    typeof e == "string" ? (n = n || {}, n.url = e) : n = e || {}, n = ke(this.defaults, n);
    const { transitional: t, paramsSerializer: i, headers: s } = n;
    t !== void 0 && oa.assertOptions(t, {
      silentJSONParsing: ie.transitional(ie.boolean),
      forcedJSONParsing: ie.transitional(ie.boolean),
      clarifyTimeoutError: ie.transitional(ie.boolean)
    }, !1), i != null && (m.isFunction(i) ? n.paramsSerializer = {
      serialize: i
    } : oa.assertOptions(i, {
      encode: ie.function,
      serialize: ie.function
    }, !0)), n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0), oa.assertOptions(n, {
      baseUrl: ie.spelling("baseURL"),
      withXsrfToken: ie.spelling("withXSRFToken")
    }, !0), n.method = (n.method || this.defaults.method || "get").toLowerCase();
    let o = s && m.merge(
      s.common,
      s[n.method]
    );
    s && m.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (f) => {
        delete s[f];
      }
    ), n.headers = $.concat(o, s);
    const r = [];
    let p = !0;
    this.interceptors.request.forEach(function(v) {
      typeof v.runWhen == "function" && v.runWhen(n) === !1 || (p = p && v.synchronous, r.unshift(v.fulfilled, v.rejected));
    });
    const d = [];
    this.interceptors.response.forEach(function(v) {
      d.push(v.fulfilled, v.rejected);
    });
    let c, l = 0, u;
    if (!p) {
      const f = [Et.bind(this), void 0];
      for (f.unshift(...r), f.push(...d), u = f.length, c = Promise.resolve(n); l < u; )
        c = c.then(f[l++], f[l++]);
      return c;
    }
    u = r.length;
    let x = n;
    for (; l < u; ) {
      const f = r[l++], v = r[l++];
      try {
        x = f(x);
      } catch (h) {
        v.call(this, h);
        break;
      }
    }
    try {
      c = Et.call(this, x);
    } catch (f) {
      return Promise.reject(f);
    }
    for (l = 0, u = d.length; l < u; )
      c = c.then(d[l++], d[l++]);
    return c;
  }
  getUri(e) {
    e = ke(this.defaults, e);
    const n = bn(e.baseURL, e.url, e.allowAbsoluteUrls);
    return xn(n, e.params, e.paramsSerializer);
  }
};
m.forEach(["delete", "get", "head", "options"], function(e) {
  we.prototype[e] = function(n, t) {
    return this.request(ke(t || {}, {
      method: e,
      url: n,
      data: (t || {}).data
    }));
  };
});
m.forEach(["post", "put", "patch"], function(e) {
  function n(t) {
    return function(s, o, r) {
      return this.request(ke(r || {}, {
        method: e,
        headers: t ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: s,
        data: o
      }));
    };
  }
  we.prototype[e] = n(), we.prototype[e + "Form"] = n(!0);
});
let vp = class Ai {
  constructor(e) {
    if (typeof e != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function(s) {
      n = s;
    });
    const t = this;
    this.promise.then((i) => {
      if (!t._listeners) return;
      let s = t._listeners.length;
      for (; s-- > 0; )
        t._listeners[s](i);
      t._listeners = null;
    }), this.promise.then = (i) => {
      let s;
      const o = new Promise((r) => {
        t.subscribe(r), s = r;
      }).then(i);
      return o.cancel = function() {
        t.unsubscribe(s);
      }, o;
    }, e(function(s, o, r) {
      t.reason || (t.reason = new fe(s, o, r), n(t.reason));
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason)
      throw this.reason;
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(e) {
    if (this.reason) {
      e(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(e) : this._listeners = [e];
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(e) {
    if (!this._listeners)
      return;
    const n = this._listeners.indexOf(e);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const e = new AbortController(), n = (t) => {
      e.abort(t);
    };
    return this.subscribe(n), e.signal.unsubscribe = () => this.unsubscribe(n), e.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let e;
    return {
      token: new Ai(function(i) {
        e = i;
      }),
      cancel: e
    };
  }
};
function bp(a) {
  return function(n) {
    return a.apply(null, n);
  };
}
function gp(a) {
  return m.isObject(a) && a.isAxiosError === !0;
}
const on = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(on).forEach(([a, e]) => {
  on[e] = a;
});
function ji(a) {
  const e = new we(a), n = Ut(we.prototype.request, e);
  return m.extend(n, we.prototype, e, { allOwnKeys: !0 }), m.extend(n, e, null, { allOwnKeys: !0 }), n.create = function(i) {
    return ji(ke(a, i));
  }, n;
}
const L = ji(We);
L.Axios = we;
L.CanceledError = fe;
L.CancelToken = vp;
L.isCancel = xi;
L.VERSION = pa;
L.toFormData = ga;
L.AxiosError = g;
L.Cancel = L.CanceledError;
L.all = function(e) {
  return Promise.all(e);
};
L.spread = bp;
L.isAxiosError = gp;
L.mergeConfig = ke;
L.AxiosHeaders = $;
L.formToJSON = (a) => fi(m.isHTMLForm(a) ? new FormData(a) : a);
L.getAdapter = Ri.getAdapter;
L.HttpStatusCode = on;
L.default = L;
const {
  Axios: Nl,
  AxiosError: zl,
  CanceledError: Il,
  isCancel: $l,
  CancelToken: Dl,
  VERSION: Ml,
  all: Hl,
  Cancel: Gl,
  isAxiosError: Wl,
  spread: Vl,
  toFormData: Jl,
  AxiosHeaders: Kl,
  HttpStatusCode: Xl,
  formToJSON: Yl,
  getAdapter: Zl,
  mergeConfig: Ql
} = L, wa = "https://gatech.instructure.com", yp = "/api/v1", wp = "/api/graphql";
class _ extends Error {
}
const _p = {
  maxRetries: 3,
  backoffFactor: 1.5,
  retryStatuses: [429, 500, 502, 503, 504]
};
function kp(a) {
  return new Promise((e) => setTimeout(e, a));
}
function Sp(a) {
  if (!a) return null;
  try {
    return new Date(a);
  } catch {
    return null;
  }
}
class Cp {
  constructor(e) {
    he(this, "axios");
    he(this, "baseUrl");
    he(this, "apiRoot");
    he(this, "timeoutMs");
    he(this, "retry");
    he(this, "verbose");
    this.baseUrl = (e.baseUrl || wa).replace(/\/$/, ""), this.apiRoot = `${this.baseUrl}${yp}`, this.timeoutMs = e.timeoutMs ?? 3e4, this.retry = e.retry ?? _p, this.verbose = !!e.verbose;
    const n = {
      Authorization: `Bearer ${e.token}`,
      Accept: "application/json"
    };
    e.userAgent && (n["User-Agent"] = e.userAgent), this.axios = L.create({
      headers: n,
      timeout: this.timeoutMs,
      validateStatus: () => !0
      // we'll handle errors
    });
  }
  async request(e) {
    let n = 0;
    for (; ; ) {
      n += 1;
      const t = e.url;
      if (this.verbose && t) {
        const s = (e.method || "GET").toUpperCase(), o = e.params ? ` params=${JSON.stringify(e.params)}` : "", r = e.data ? ` data=${typeof e.data == "string" ? "[string]" : JSON.stringify(e.data).slice(0, 200)}` : "";
        console.log(`[${s}] ${t}${o}${r}`);
      }
      const i = await this.axios.request(e);
      if (this.retry.retryStatuses.includes(i.status) && n <= this.retry.maxRetries) {
        const s = i.headers["retry-after"], o = s ? Math.max(500, Number(s) * 1e3 || 0) : this.retry.backoffFactor * n * 1e3;
        this.verbose && console.warn(`Retrying (${n}/${this.retry.maxRetries}) in ${(o / 1e3).toFixed(1)}s due to ${i.status}...`), await kp(o);
        continue;
      }
      if (i.status >= 400) {
        let s;
        try {
          s = i.data;
        } catch {
          s = i.statusText;
        }
        throw new _(`HTTP ${i.status} for ${e.url}: ${JSON.stringify(s, null, 2)}`);
      }
      return i;
    }
  }
  url(e) {
    return /^https?:\/\//.test(e) ? e : `${this.apiRoot}${e}`;
  }
  async get(e, n) {
    return (await this.request({ method: "GET", url: this.url(e), params: n })).data;
  }
  async post(e, n) {
    return (await this.request({ method: "POST", url: this.url(e), data: n })).data;
  }
  async put(e, n) {
    return (await this.request({ method: "PUT", url: this.url(e), data: n })).data;
  }
  async del(e, n) {
    return (await this.request({ method: "DELETE", url: this.url(e), params: n })).data;
  }
  async paginate(e, n) {
    const t = [];
    let i = this.url(e), s = !0;
    for (; i; ) {
      const o = await this.request({ method: "GET", url: i, params: s ? n : void 0 });
      s = !1;
      const r = o.data;
      if (Array.isArray(r))
        t.push(...r);
      else {
        t.push(r);
        break;
      }
      const p = o.headers.link || o.headers.Link;
      if (p) {
        const d = p.split(",").map((c) => c.trim()).find((c) => c.endsWith('rel="next"'));
        if (d) {
          const c = d.match(/<(.*)>/);
          i = c ? c[1] : null;
        } else
          i = null;
      } else
        i = null;
    }
    return t;
  }
  // Convenience REST
  getProfile() {
    return this.get("/users/self/profile");
  }
  listCourses(e = {}) {
    const n = { per_page: e.per_page ?? 100, enrollment_state: e.enrollment_state ?? "active" };
    return e.include && (n["include[]"] = e.include), this.paginate("/courses", n);
  }
  listCourseAssignmentsRest(e, n, t = 100) {
    const i = { per_page: t };
    return n && (i["include[]"] = n), this.paginate(`/courses/${e}/assignments`, i);
  }
  listAssignmentsWithSubmission(e, n = 100) {
    const t = { per_page: n, "include[]": ["submission"] };
    return this.paginate(`/courses/${e}/assignments`, t);
  }
  listAssignmentGroups(e, n = !1) {
    const t = { per_page: 100 }, i = ["rules"];
    return n && i.push("assignments"), t["include[]"] = i, this.paginate(`/courses/${e}/assignment_groups`, t);
  }
  listCourseTabs(e, n = !0) {
    const t = { per_page: 100 };
    return n && (t["include[]"] = ["external"]), this.paginate(`/courses/${e}/tabs`, t);
  }
  // Activity stream (cross-course), useful for announcements aggregation
  listActivityStream(e = {}) {
    const n = {
      per_page: Math.min(100, Math.max(1, e.perPage ?? 100)),
      only_active_courses: e.onlyActiveCourses ?? !0
    };
    return this.paginate("/users/self/activity_stream", n);
  }
  // Announcements (Discussions API)
  listCourseAnnouncements(e, n = 50) {
    const t = { per_page: Math.min(100, Math.max(1, n)), only_announcements: !0 };
    return this.paginate(`/courses/${e}/discussion_topics`, t);
  }
  // Single-page announcements fetch for pagination UI
  listCourseAnnouncementsPage(e, n = 1, t = 10) {
    const i = { per_page: Math.min(100, Math.max(1, t)), page: Math.max(1, Number(n) || 1), only_announcements: !0 };
    return this.get(`/courses/${e}/discussion_topics`, i);
  }
  getAnnouncement(e, n) {
    return this.get(`/courses/${e}/discussion_topics/${n}`);
  }
  listMyEnrollmentsForCourse(e) {
    const n = { user_id: "self", "type[]": ["StudentEnrollment"] };
    return this.paginate(`/courses/${e}/enrollments`, n);
  }
  // GraphQL
  async graphql(e, n, t) {
    const i = `${this.baseUrl}${wp}`, s = { query: e };
    n && (s.variables = n), t && (s.operationName = t);
    const r = (await this.request({ method: "POST", url: i, data: s })).data;
    if (r && r.errors && r.errors.length)
      throw new _(JSON.stringify(r.errors, null, 2));
    return r;
  }
  async graphqlPaginate(e, n, t, i = "after") {
    const s = { ...n };
    let o = s[i];
    const r = [];
    for (; ; ) {
      s[i] = o;
      const p = await this.graphql(e, s), { nodes: d, endCursor: c, hasNextPage: l } = t(p);
      if (r.push(...d), !l || !c) break;
      o = c;
    }
    return r;
  }
  async listCourseAssignmentsGql(e, n = 100) {
    return await this.graphqlPaginate(
      `
      query Assignments($id: ID!, $first: Int = 100, $after: String) {
        course(id: $id) {
          _id
          name
          assignmentsConnection(first: $first, after: $after) {
            nodes { id _id name dueAt state pointsPossible submissionTypes htmlUrl }
            pageInfo { endCursor hasNextPage }
          }
        }
      }
    `,
      { id: String(e), first: n },
      (s) => {
        var r, p, d, c;
        const o = (p = (r = s == null ? void 0 : s.data) == null ? void 0 : r.course) == null ? void 0 : p.assignmentsConnection;
        return {
          nodes: (o == null ? void 0 : o.nodes) ?? [],
          endCursor: ((d = o == null ? void 0 : o.pageInfo) == null ? void 0 : d.endCursor) ?? null,
          hasNextPage: ((c = o == null ? void 0 : o.pageInfo) == null ? void 0 : c.hasNextPage) ?? !1
        };
      }
    );
  }
  async listCourseModulesGql(e, n = 20, t = 50) {
    try {
      const s = await this.graphqlPaginate(
        `
        query CourseModules($id: ID!, $first: Int = 20, $after: String, $itemsFirst: Int = 50) {
          course(id: $id) {
            _id
            name
            modulesConnection(first: $first, after: $after) {
              nodes {
                id
                _id
                name
                position
                moduleItemsConnection(first: $itemsFirst) {
                  nodes {
                    id
                    _id
                    __typename
                    title
                  }
                  pageInfo { endCursor hasNextPage }
                }
              }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      `,
        { id: String(e), first: n, itemsFirst: t },
        (r) => {
          var d, c, l, u;
          const p = (c = (d = r == null ? void 0 : r.data) == null ? void 0 : d.course) == null ? void 0 : c.modulesConnection;
          return {
            nodes: (p == null ? void 0 : p.nodes) ?? [],
            endCursor: ((l = p == null ? void 0 : p.pageInfo) == null ? void 0 : l.endCursor) ?? null,
            hasNextPage: ((u = p == null ? void 0 : p.pageInfo) == null ? void 0 : u.hasNextPage) ?? !1
          };
        }
      );
      return await Promise.all(
        s.map(async (r) => {
          var p;
          try {
            const d = await this.paginate(
              `/courses/${e}/modules/${r._id}/items`,
              { per_page: 100 }
            ), c = new Map(d.map((u) => [String(u.id), u])), l = (((p = r.moduleItemsConnection) == null ? void 0 : p.nodes) || []).map((u) => {
              const x = c.get(String(u._id));
              return {
                ...u,
                htmlUrl: x == null ? void 0 : x.html_url,
                contentId: x == null ? void 0 : x.content_id,
                pageUrl: x == null ? void 0 : x.page_url
              };
            });
            return { ...r, moduleItemsConnection: { nodes: l } };
          } catch {
            return r;
          }
        })
      );
    } catch {
      const s = await this.paginate(
        `/courses/${e}/modules`,
        { per_page: 50, "include[]": ["items", "content_details"] }
      ), o = (p) => {
        switch ((p || "").toLowerCase()) {
          case "assignment":
            return "AssignmentModuleItem";
          case "page":
            return "PageModuleItem";
          case "file":
            return "FileModuleItem";
          case "discussion":
            return "DiscussionModuleItem";
          case "externalurl":
            return "ExternalUrlModuleItem";
          case "quiz":
            return "QuizModuleItem";
          default:
            return "ModuleItem";
        }
      };
      return (s || []).map((p) => ({
        id: p.id,
        _id: String(p.id),
        name: p.name,
        position: p.position,
        moduleItemsConnection: {
          nodes: (p.items || []).map((d) => ({
            id: d.id,
            _id: String(d.id),
            __typename: o(d.type),
            title: d.title,
            htmlUrl: d.html_url,
            contentId: d.content_id,
            pageUrl: d.page_url
          }))
        }
      }));
    }
  }
  async listUpcoming(e = {}) {
    const n = e.onlyActiveCourses ?? !0;
    return this.get("/users/self/upcoming_events", { only_active_courses: n });
  }
  async listTodo() {
    return this.get("/users/self/todo");
  }
  async getMySubmission(e, n) {
    return this.get(`/courses/${e}/assignments/${n}/submissions/self`);
  }
  // Pages (REST)
  async listCoursePages(e, n = 100) {
    return this.paginate(`/courses/${e}/pages`, { per_page: n });
  }
  async getCoursePage(e, n) {
    let t = n;
    try {
      if (/^https?:\/\//.test(n)) {
        const s = new URL(n).pathname.split("/"), o = s.indexOf("pages");
        o >= 0 && s[o + 1] && (t = s[o + 1]);
      }
    } catch {
    }
    return this.get(`/courses/${e}/pages/${t}`);
  }
  // Course info + front page
  async getCourseInfo(e) {
    return this.get(`/courses/${e}`, { "include[]": ["syllabus_body", "course_image"] });
  }
  async getCourseFrontPage(e) {
    return this.get(`/courses/${e}/front_page`);
  }
  // Assignments (REST detail for description)
  async getAssignmentRest(e, n) {
    return this.get(`/courses/${e}/assignments/${n}`);
  }
  // Files
  async getFile(e) {
    return this.get(`/files/${e}`);
  }
  async downloadFile(e) {
    const n = await this.get(`/files/${e}`), t = n.url;
    if (!t) throw new Error("No file URL available");
    const i = me.getPath("temp"), s = (n.filename || `file-${e}`).replace(/[^a-zA-Z0-9.-]/g, "_"), o = J.join(i, `canvas-${e}-${s}`);
    if (se.existsSync(o))
      return o;
    const r = await fetch(t);
    if (!r.ok) throw new Error(`Failed to fetch file: ${r.statusText}`);
    if (!r.body) throw new Error("No response body");
    const p = Hi(o);
    return await Xi(Yi.fromWeb(r.body), p), o;
  }
  async getFileBytes(e) {
    const t = (await this.get(`/files/${e}`)).url;
    if (!t)
      throw new Error("No file URL available");
    const i = await fetch(t, {
      method: "GET"
      // The signed URL is usually public, so we don't need Authorization header
    });
    if (!i.ok)
      throw new Error(`Failed to fetch file bytes: ${i.statusText}`);
    return i.arrayBuffer();
  }
  async listCourseFolders(e, n = 100) {
    return this.paginate(`/courses/${e}/folders`, { per_page: Math.min(100, Math.max(1, n)) });
  }
  async listFolderFiles(e, n = 100) {
    return this.paginate(`/folders/${e}/files`, { per_page: Math.min(100, Math.max(1, n)) });
  }
  async listCourseUsers(e, n = 100) {
    const t = {
      per_page: Math.min(100, Math.max(1, n)),
      "include[]": ["avatar_url", "enrollments", "email"]
    };
    return this.paginate(`/courses/${e}/users`, t);
  }
  // Groups
  async listCourseGroups(e, n = 100) {
    const t = {
      per_page: Math.min(100, Math.max(1, n)),
      "include[]": ["users"]
    };
    return this.paginate(`/courses/${e}/groups`, t);
  }
  async listMyGroups(e) {
    const n = { per_page: 100 };
    return e && (n.context_type = e), this.paginate("/users/self/groups", n);
  }
  async listGroupUsers(e, n = 100) {
    const t = {
      per_page: Math.min(100, Math.max(1, n)),
      "include[]": ["avatar_url"]
    };
    return this.paginate(`/groups/${e}/users`, t);
  }
  // Conversations (Inbox)
  async listConversations(e = {}) {
    const n = {
      per_page: e.perPage ?? 25,
      "include[]": ["participant_avatars"]
    };
    return e.scope && (n.scope = e.scope), this.paginate("/conversations", n);
  }
  async getConversation(e) {
    return this.get(`/conversations/${e}`, {
      "include[]": ["participant_avatars"],
      auto_mark_as_read: !1
      // Don't mark as read just by viewing
    });
  }
  async getUnreadCount() {
    return this.get("/conversations/unread_count");
  }
  async createConversation(e) {
    const n = new URLSearchParams();
    for (const i of e.recipients)
      n.append("recipients[]", i);
    return n.append("body", e.body), n.append("group_conversation", String(e.groupConversation ?? !0)), e.subject && n.append("subject", e.subject), e.contextCode && n.append("context_code", e.contextCode), (await this.axios.request({
      method: "POST",
      url: this.url("/conversations"),
      data: n.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })).data;
  }
  async addMessage(e, n, t) {
    const i = { body: n };
    return t && t.length > 0 && (i["included_messages[]"] = t), this.post(`/conversations/${e}/add_message`, i);
  }
  async updateConversation(e, n) {
    const t = {};
    return n.workflowState && (t["conversation[workflow_state]"] = n.workflowState), n.starred !== void 0 && (t["conversation[starred]"] = n.starred), n.subscribed !== void 0 && (t["conversation[subscribed]"] = n.subscribed), this.put(`/conversations/${e}`, t);
  }
  async deleteConversation(e) {
    return this.del(`/conversations/${e}`);
  }
  async searchRecipients(e) {
    const n = {
      search: e.search,
      per_page: e.perPage ?? 10,
      permissions: ["send_messages_all"]
    };
    return e.context && (n.context = e.context), e.type && (n.type = e.type), this.get("/search/recipients", n);
  }
  async listCourseFiles(e, n = 100, t = "updated_at", i = "desc") {
    const s = { per_page: Math.min(100, Math.max(1, n)), sort: t, order: i };
    return this.paginate(`/courses/${e}/files`, s);
  }
  async listDueAssignmentsGql(e = {}) {
    const n = e.days ?? 7, t = e.onlyPublished ?? !0, i = e.includeCourseName ?? !0, s = await this.listCourses({ enrollment_state: "active" }), o = /* @__PURE__ */ new Date(), r = new Date(o.getTime() + n * 24 * 60 * 60 * 1e3), p = [], d = 6, c = (s || []).map((x) => async () => {
      const f = x == null ? void 0 : x.id, v = (x == null ? void 0 : x.name) ?? "";
      if (f)
        try {
          const h = await this.listCourseAssignmentsGql(f, 200);
          for (const b of h) {
            if (t && (b == null ? void 0 : b.state) !== "published") continue;
            const w = Sp(b == null ? void 0 : b.dueAt);
            if (w && w >= o && w <= r) {
              const k = {
                course_id: f,
                assignment_rest_id: b != null && b._id ? Number(b._id) : null,
                assignment_graphql_id: b == null ? void 0 : b.id,
                name: b == null ? void 0 : b.name,
                dueAt: w.toISOString(),
                state: b == null ? void 0 : b.state,
                pointsPossible: b == null ? void 0 : b.pointsPossible,
                htmlUrl: b == null ? void 0 : b.htmlUrl
              };
              i && (k.course_name = v), p.push(k);
            }
          }
        } catch {
        }
    });
    let l = 0;
    const u = Array.from({ length: Math.min(d, c.length) }, () => (async () => {
      for (; l < c.length; ) {
        const x = l++;
        await c[x]();
      }
    })());
    return await Promise.all(u), p.sort((x, f) => String(x.dueAt).localeCompare(String(f.dueAt))), p;
  }
}
const An = "canvas-desk";
let da = null, Be = wa, aa = null;
async function jn() {
  if (aa) return aa;
  try {
    const a = await import("keytar");
    return aa = a.default ?? a, aa;
  } catch (a) {
    throw new _(`Failed to load keytar: ${String((a == null ? void 0 : a.message) || a)}`);
  }
}
function Ti() {
  const a = me.getPath("userData");
  return J.join(a, "canvas-desk-tokens.json");
}
function Tn() {
  try {
    const a = Ti();
    return se.existsSync(a) ? JSON.parse(se.readFileSync(a, "utf-8")) || {} : {};
  } catch {
    return {};
  }
}
function Oi(a) {
  try {
    const e = Ti();
    se.mkdirSync(J.dirname(e), { recursive: !0 }), se.writeFileSync(e, JSON.stringify(a, null, 2));
  } catch {
  }
}
async function Ep(a, e) {
  try {
    return await (await jn()).setPassword(An, a, e), { insecure: !1 };
  } catch {
    const n = Tn();
    return n[a] = e, Oi(n), { insecure: !0 };
  }
}
async function Rp(a) {
  try {
    return { token: await (await jn()).getPassword(An, a) || null, insecure: !1 };
  } catch {
    const n = Tn()[a] || null;
    return { token: n, insecure: !!n };
  }
}
async function Ap(a) {
  try {
    return await (await jn()).deletePassword(An, a), { insecure: !1 };
  } catch {
    const e = Tn();
    return delete e[a], Oi(e), { insecure: !0 };
  }
}
async function jp(a) {
  Be = (a.baseUrl || wa).replace(/\/$/, "");
  let e = !1;
  if (a.token) {
    const i = await Ep(Be, a.token);
    e = e || i.insecure;
  }
  const n = await Rp(Be);
  e = e || n.insecure;
  const t = a.token || n.token;
  if (!t) throw new _("No Canvas token set. Provide token in init or save one first.");
  return da = new Cp({ token: t, baseUrl: Be, verbose: !!a.verbose }), { insecure: e };
}
async function Tp(a) {
  const e = (a || Be || wa).replace(/\/$/, "");
  await Ap(e), da = null;
}
function E() {
  if (!da) throw new _("Canvas client is not initialized. Call initCanvas first.");
  return da;
}
async function Op() {
  return E().getProfile();
}
async function Pp(a) {
  return E().listCourses({ enrollment_state: (a == null ? void 0 : a.enrollment_state) || "active" });
}
async function Fp(a) {
  return E().listDueAssignmentsGql(a);
}
async function Up(a, e = 200) {
  return E().listCourseAssignmentsGql(a, e);
}
async function qp(a, e = 100) {
  return E().listAssignmentsWithSubmission(a, e);
}
async function Lp(a, e = !1) {
  return E().listAssignmentGroups(a, e);
}
async function Bp(a) {
  return E().listMyEnrollmentsForCourse(a);
}
async function Np(a, e = !0) {
  return E().listCourseTabs(a, e);
}
async function zp(a) {
  return E().listActivityStream(a);
}
async function Ip(a, e = 50) {
  return E().listCourseAnnouncements(a, e);
}
async function $p(a, e = 1, n = 10) {
  return E().listCourseAnnouncementsPage(a, e, n);
}
async function Dp(a, e) {
  return E().getAnnouncement(a, e);
}
async function Mp(a, e = 20, n = 50) {
  return E().listCourseModulesGql(a, e, n);
}
async function Hp(a) {
  return E().listUpcoming({ onlyActiveCourses: a == null ? void 0 : a.onlyActiveCourses });
}
async function Gp() {
  return E().listTodo();
}
async function Wp(a, e) {
  return E().getMySubmission(a, e);
}
async function Vp(a, e = 100) {
  return E().listCoursePages(a, e);
}
async function Jp(a, e) {
  return E().getCoursePage(a, e);
}
async function Kp(a) {
  return E().getCourseInfo(a);
}
async function Xp(a) {
  return E().getCourseFrontPage(a);
}
async function Yp(a, e) {
  return E().getAssignmentRest(a, e);
}
async function Zp(a) {
  return E().getFile(a);
}
async function Qp(a) {
  return E().downloadFile(a);
}
async function el(a, e = 100, n = "updated_at", t = "desc") {
  return E().listCourseFiles(a, e, n, t);
}
async function al(a, e = 100) {
  return E().listCourseFolders(a, e);
}
async function nl(a, e = 100) {
  return E().listFolderFiles(a, e);
}
async function tl(a, e = 100) {
  return E().listCourseUsers(a, e);
}
async function il(a, e = 100) {
  return E().listCourseGroups(a, e);
}
async function sl(a) {
  return E().listMyGroups(a);
}
async function ol(a, e = 100) {
  return E().listGroupUsers(a, e);
}
async function rl(a) {
  return E().listConversations(a);
}
async function cl(a) {
  return E().getConversation(a);
}
async function pl() {
  return E().getUnreadCount();
}
async function ll(a) {
  return E().createConversation(a);
}
async function ul(a, e, n) {
  return E().addMessage(a, e, n);
}
async function dl(a, e) {
  return E().updateConversation(a, e);
}
async function ml(a) {
  return E().deleteConversation(a);
}
async function fl(a) {
  return E().searchRecipients(a);
}
const Ya = {
  baseUrl: "https://gatech.instructure.com",
  verbose: !1,
  theme: "light",
  accent: "default",
  prefetchEnabled: !0,
  cachedCourses: [],
  cachedDue: [],
  queryCache: void 0,
  courseImages: {},
  sidebar: {
    hiddenCourseIds: [],
    customNames: {},
    order: []
  },
  userSettings: {},
  userSidebars: {},
  pdfGestureZoomEnabled: !0,
  pdfZoom: {}
};
function Pi() {
  const a = me.getPath("userData");
  return J.join(a, "canvas-desk.json");
}
function _a() {
  try {
    const a = Pi();
    if (!se.existsSync(a)) return { ...Ya };
    const e = se.readFileSync(a, "utf-8"), n = JSON.parse(e);
    return { ...Ya, ...n };
  } catch {
    return { ...Ya };
  }
}
function Fi(a) {
  const n = { ..._a(), ...a }, t = Pi();
  try {
    se.mkdirSync(J.dirname(t), { recursive: !0 }), se.writeFileSync(t, JSON.stringify(n, null, 2));
  } catch {
  }
  return n;
}
const Ui = J.dirname(Di(import.meta.url));
process.env.APP_ROOT = J.join(Ui, "..");
const rn = process.env.VITE_DEV_SERVER_URL, eu = J.join(process.env.APP_ROOT, "dist-electron"), On = J.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = rn ? J.join(process.env.APP_ROOT, "public") : On;
let D, ee = _a();
function qi() {
  const a = process.env.VITE_PUBLIC || On, e = [
    "icon.png",
    "icon.icns",
    "icon.ico",
    // fallback to the template SVG if no PNG/ICO/ICNS is present
    "electron-vite.svg"
  ].map((n) => J.join(a, n));
  for (const n of e)
    try {
      if (se.existsSync(n)) return n;
    } catch {
    }
}
function Li() {
  const a = qi(), e = ee == null ? void 0 : ee.theme, n = e === "dark" || !e && process.platform === "darwin", t = n ? "#020617" : "#ffffff";
  D = new At({
    ...a ? { icon: a } : {},
    // Start hidden to prevent white flash - will show on ready-to-show
    show: !1,
    backgroundColor: t,
    // Make the titlebar blend with renderer UI on macOS
    // - hiddenInset keeps native traffic lights but removes the opaque title bar
    // - titleBarOverlay lets our content extend into the titlebar area
    ...process.platform === "darwin" ? {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 20, y: 20 },
      // add some padding around the traffic lights
      titleBarOverlay: {
        color: "#00000000",
        // transparent so the Header background shows through
        symbolColor: n ? "#ffffff" : "#000000",
        // contrast based on theme
        height: 56
        // match Header height (h-14)
      }
    } : {},
    webPreferences: {
      preload: J.join(Ui, "preload.mjs"),
      webviewTag: !0,
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !0
    }
  }), D.once("ready-to-show", () => {
    D == null || D.show();
  }), D.webContents.setWindowOpenHandler(({ url: i }) => ((i.startsWith("https:") || i.startsWith("http:")) && jt.openExternal(i), { action: "deny" }));
  try {
    D.webContents.setVisualZoomLevelLimits(1, 1);
  } catch {
  }
  try {
    D.webContents.setZoomFactor(1), D.webContents.setZoomLevel(0);
  } catch {
  }
  D.webContents.on("did-finish-load", () => {
    D == null || D.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), rn ? D.loadURL(rn) : D.loadFile(J.join(On, "index.html"), { hash: "/dashboard" });
}
me.on("window-all-closed", () => {
  process.platform !== "darwin" && (me.quit(), D = null);
});
me.on("activate", () => {
  At.getAllWindows().length === 0 && Li();
});
me.whenReady().then(() => {
  if (ee = _a(), zi.handle("canvas-file", (a) => {
    const e = a.url.replace(/^canvas-file:\/\//, ""), n = decodeURIComponent(e);
    return Ii.fetch(Mi(n).toString());
  }), process.platform === "darwin") {
    const a = qi() || J.join(process.env.APP_ROOT, "build", "icons", "mac", "icon.icns");
    try {
      a && me.dock.setIcon($i.createFromPath(a));
    } catch {
    }
  }
  Li();
});
C.handle("canvas:init", async (a, e) => {
  try {
    const n = (e == null ? void 0 : e.baseUrl) || ee.baseUrl, t = (e == null ? void 0 : e.verbose) ?? ee.verbose, i = await jp({ token: e == null ? void 0 : e.token, baseUrl: n, verbose: t });
    return ee = Fi({ baseUrl: n, verbose: t }), { ok: !0, insecure: !!(i != null && i.insecure) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:clearToken", async (a, e) => {
  try {
    return await Tp(e), { ok: !0 };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:getProfile", async () => {
  try {
    return { ok: !0, data: await Op() };
  } catch (a) {
    return { ok: !1, error: a instanceof _ ? a.message : String((a == null ? void 0 : a.message) || a) };
  }
});
C.handle("canvas:listCourses", async (a, e) => {
  try {
    return { ok: !0, data: await Pp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listDueAssignments", async (a, e) => {
  try {
    return { ok: !0, data: await Fp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listCourseAssignments", async (a, e, n = 200) => {
  try {
    return { ok: !0, data: await Up(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listCourseModulesGql", async (a, e, n = 20, t = 50) => {
  try {
    return { ok: !0, data: await Mp(e, n, t) };
  } catch (i) {
    return { ok: !1, error: i instanceof _ ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
C.handle("canvas:listUpcoming", async (a, e) => {
  try {
    return { ok: !0, data: await Hp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listTodo", async () => {
  try {
    return { ok: !0, data: await Gp() };
  } catch (a) {
    return { ok: !1, error: a instanceof _ ? a.message : String((a == null ? void 0 : a.message) || a) };
  }
});
C.handle("canvas:getMySubmission", async (a, e, n) => {
  try {
    return { ok: !0, data: await Wp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listCoursePages", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await Vp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:getCoursePage", async (a, e, n) => {
  try {
    return { ok: !0, data: await Jp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:getAssignmentRest", async (a, e, n) => {
  try {
    return { ok: !0, data: await Yp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:getFile", async (a, e) => {
  try {
    return { ok: !0, data: await Zp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listAssignmentsWithSubmission", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await qp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listAssignmentGroups", async (a, e, n = !1) => {
  try {
    return { ok: !0, data: await Lp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listMyEnrollmentsForCourse", async (a, e) => {
  try {
    return { ok: !0, data: await Bp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listCourseTabs", async (a, e, n = !0) => {
  try {
    return { ok: !0, data: await Np(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listActivityStream", async (a, e) => {
  try {
    return { ok: !0, data: await zp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listCourseAnnouncements", async (a, e, n = 50) => {
  try {
    return { ok: !0, data: await Ip(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listCourseAnnouncementsPage", async (a, e, n = 1, t = 10) => {
  try {
    return { ok: !0, data: await $p(e, n, t) };
  } catch (i) {
    return { ok: !1, error: i instanceof _ ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
C.handle("canvas:getCourseInfo", async (a, e) => {
  try {
    return { ok: !0, data: await Kp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:getCourseFrontPage", async (a, e) => {
  try {
    return { ok: !0, data: await Xp(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listCourseFiles", async (a, e, n = 100, t = "updated_at", i = "desc") => {
  try {
    return { ok: !0, data: await el(e, n, t, i) };
  } catch (s) {
    return { ok: !1, error: s instanceof _ ? s.message : String((s == null ? void 0 : s.message) || s) };
  }
});
C.handle("canvas:listCourseFolders", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await al(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listFolderFiles", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await nl(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listCourseUsers", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await tl(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listCourseGroups", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await il(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:listMyGroups", async (a, e) => {
  try {
    return { ok: !0, data: await sl(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listGroupUsers", async (a, e, n = 100) => {
  try {
    return { ok: !0, data: await ol(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:getAnnouncement", async (a, e, n) => {
  try {
    return { ok: !0, data: await Dp(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:getFileBytes", async (a, e) => {
  try {
    const n = await Qp(e);
    return { ok: !0, data: `canvas-file://${encodeURIComponent(n)}` };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:listConversations", async (a, e) => {
  try {
    return { ok: !0, data: await rl(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:getConversation", async (a, e) => {
  try {
    return { ok: !0, data: await cl(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:getUnreadCount", async () => {
  try {
    return { ok: !0, data: await pl() };
  } catch (a) {
    return { ok: !1, error: a instanceof _ ? a.message : String((a == null ? void 0 : a.message) || a) };
  }
});
C.handle("canvas:createConversation", async (a, e) => {
  try {
    return { ok: !0, data: await ll(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:addMessage", async (a, e, n, t) => {
  try {
    return { ok: !0, data: await ul(e, n, t) };
  } catch (i) {
    return { ok: !1, error: i instanceof _ ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
C.handle("canvas:updateConversation", async (a, e, n) => {
  try {
    return { ok: !0, data: await dl(e, n) };
  } catch (t) {
    return { ok: !1, error: t instanceof _ ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
C.handle("canvas:deleteConversation", async (a, e) => {
  try {
    return { ok: !0, data: await ml(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("canvas:searchRecipients", async (a, e) => {
  try {
    return { ok: !0, data: await fl(e) };
  } catch (n) {
    return { ok: !1, error: n instanceof _ ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("app:openExternal", async (a, e) => {
  try {
    const n = new URL(e);
    return n.protocol === "http:" || n.protocol === "https:" || n.protocol === "mailto:" ? (await jt.openExternal(e), { ok: !0 }) : { ok: !1, error: "Invalid protocol" };
  } catch (n) {
    return { ok: !1, error: String((n == null ? void 0 : n.message) || n) };
  }
});
C.handle("config:get", async () => {
  try {
    return ee = _a(), { ok: !0, data: ee };
  } catch (a) {
    return { ok: !1, error: String((a == null ? void 0 : a.message) || a) };
  }
});
C.handle("config:set", async (a, e) => {
  try {
    return ee = Fi(e), { ok: !0, data: ee };
  } catch (n) {
    return { ok: !1, error: String((n == null ? void 0 : n.message) || n) };
  }
});
export {
  eu as MAIN_DIST,
  On as RENDERER_DIST,
  rn as VITE_DEV_SERVER_URL
};
