var Tt = Object.defineProperty;
var Ot = (e, a, n) => a in e ? Tt(e, a, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[a] = n;
var re = (e, a, n) => Ot(e, typeof a != "symbol" ? a + "" : a, n);
import { app as we, BrowserWindow as wi, ipcMain as A, shell as Ft } from "electron";
import { fileURLToPath as Pt } from "node:url";
import W from "node:path";
import Se from "util";
import G, { Readable as qt } from "stream";
import ki from "path";
import sn from "http";
import on from "https";
import oa from "url";
import Ut from "fs";
import _i from "crypto";
import Lt from "assert";
import Si from "tty";
import Bt from "os";
import ae from "zlib";
import { EventEmitter as zt } from "events";
import te from "node:fs";
function Ei(e, a) {
  return function() {
    return e.apply(a, arguments);
  };
}
const { toString: Nt } = Object.prototype, { getPrototypeOf: rn } = Object, { iterator: ra, toStringTag: Ri } = Symbol, ca = /* @__PURE__ */ ((e) => (a) => {
  const n = Nt.call(a);
  return e[n] || (e[n] = n.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null)), J = (e) => (e = e.toLowerCase(), (a) => ca(a) === e), pa = (e) => (a) => typeof a === e, { isArray: Ee } = Array, Te = pa("undefined");
function qe(e) {
  return e !== null && !Te(e) && e.constructor !== null && !Te(e.constructor) && I(e.constructor.isBuffer) && e.constructor.isBuffer(e);
}
const Ci = J("ArrayBuffer");
function $t(e) {
  let a;
  return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? a = ArrayBuffer.isView(e) : a = e && e.buffer && Ci(e.buffer), a;
}
const It = pa("string"), I = pa("function"), Ai = pa("number"), Ue = (e) => e !== null && typeof e == "object", Dt = (e) => e === !0 || e === !1, Je = (e) => {
  if (ca(e) !== "object")
    return !1;
  const a = rn(e);
  return (a === null || a === Object.prototype || Object.getPrototypeOf(a) === null) && !(Ri in e) && !(ra in e);
}, Mt = (e) => {
  if (!Ue(e) || qe(e))
    return !1;
  try {
    return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
  } catch {
    return !1;
  }
}, Ht = J("Date"), Gt = J("File"), Wt = J("Blob"), Vt = J("FileList"), Jt = (e) => Ue(e) && I(e.pipe), Kt = (e) => {
  let a;
  return e && (typeof FormData == "function" && e instanceof FormData || I(e.append) && ((a = ca(e)) === "formdata" || // detect form-data instance
  a === "object" && I(e.toString) && e.toString() === "[object FormData]"));
}, Xt = J("URLSearchParams"), [Yt, Qt, Zt, es] = ["ReadableStream", "Request", "Response", "Headers"].map(J), as = (e) => e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function Le(e, a, { allOwnKeys: n = !1 } = {}) {
  if (e === null || typeof e > "u")
    return;
  let i, t;
  if (typeof e != "object" && (e = [e]), Ee(e))
    for (i = 0, t = e.length; i < t; i++)
      a.call(null, e[i], i, e);
  else {
    if (qe(e))
      return;
    const s = n ? Object.getOwnPropertyNames(e) : Object.keys(e), o = s.length;
    let c;
    for (i = 0; i < o; i++)
      c = s[i], a.call(null, e[c], c, e);
  }
}
function ji(e, a) {
  if (qe(e))
    return null;
  a = a.toLowerCase();
  const n = Object.keys(e);
  let i = n.length, t;
  for (; i-- > 0; )
    if (t = n[i], a === t.toLowerCase())
      return t;
  return null;
}
const ce = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, Ti = (e) => !Te(e) && e !== ce;
function Va() {
  const { caseless: e } = Ti(this) && this || {}, a = {}, n = (i, t) => {
    const s = e && ji(a, t) || t;
    Je(a[s]) && Je(i) ? a[s] = Va(a[s], i) : Je(i) ? a[s] = Va({}, i) : Ee(i) ? a[s] = i.slice() : a[s] = i;
  };
  for (let i = 0, t = arguments.length; i < t; i++)
    arguments[i] && Le(arguments[i], n);
  return a;
}
const ns = (e, a, n, { allOwnKeys: i } = {}) => (Le(a, (t, s) => {
  n && I(t) ? e[s] = Ei(t, n) : e[s] = t;
}, { allOwnKeys: i }), e), is = (e) => (e.charCodeAt(0) === 65279 && (e = e.slice(1)), e), ts = (e, a, n, i) => {
  e.prototype = Object.create(a.prototype, i), e.prototype.constructor = e, Object.defineProperty(e, "super", {
    value: a.prototype
  }), n && Object.assign(e.prototype, n);
}, ss = (e, a, n, i) => {
  let t, s, o;
  const c = {};
  if (a = a || {}, e == null) return a;
  do {
    for (t = Object.getOwnPropertyNames(e), s = t.length; s-- > 0; )
      o = t[s], (!i || i(o, e, a)) && !c[o] && (a[o] = e[o], c[o] = !0);
    e = n !== !1 && rn(e);
  } while (e && (!n || n(e, a)) && e !== Object.prototype);
  return a;
}, os = (e, a, n) => {
  e = String(e), (n === void 0 || n > e.length) && (n = e.length), n -= a.length;
  const i = e.indexOf(a, n);
  return i !== -1 && i === n;
}, rs = (e) => {
  if (!e) return null;
  if (Ee(e)) return e;
  let a = e.length;
  if (!Ai(a)) return null;
  const n = new Array(a);
  for (; a-- > 0; )
    n[a] = e[a];
  return n;
}, cs = /* @__PURE__ */ ((e) => (a) => e && a instanceof e)(typeof Uint8Array < "u" && rn(Uint8Array)), ps = (e, a) => {
  const i = (e && e[ra]).call(e);
  let t;
  for (; (t = i.next()) && !t.done; ) {
    const s = t.value;
    a.call(e, s[0], s[1]);
  }
}, ls = (e, a) => {
  let n;
  const i = [];
  for (; (n = e.exec(a)) !== null; )
    i.push(n);
  return i;
}, us = J("HTMLFormElement"), ds = (e) => e.toLowerCase().replace(
  /[-_\s]([a-z\d])(\w*)/g,
  function(n, i, t) {
    return i.toUpperCase() + t;
  }
), jn = (({ hasOwnProperty: e }) => (a, n) => e.call(a, n))(Object.prototype), ms = J("RegExp"), Oi = (e, a) => {
  const n = Object.getOwnPropertyDescriptors(e), i = {};
  Le(n, (t, s) => {
    let o;
    (o = a(t, s, e)) !== !1 && (i[s] = o || t);
  }), Object.defineProperties(e, i);
}, fs = (e) => {
  Oi(e, (a, n) => {
    if (I(e) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
      return !1;
    const i = e[n];
    if (I(i)) {
      if (a.enumerable = !1, "writable" in a) {
        a.writable = !1;
        return;
      }
      a.set || (a.set = () => {
        throw Error("Can not rewrite read-only method '" + n + "'");
      });
    }
  });
}, xs = (e, a) => {
  const n = {}, i = (t) => {
    t.forEach((s) => {
      n[s] = !0;
    });
  };
  return Ee(e) ? i(e) : i(String(e).split(a)), n;
}, vs = () => {
}, hs = (e, a) => e != null && Number.isFinite(e = +e) ? e : a;
function bs(e) {
  return !!(e && I(e.append) && e[Ri] === "FormData" && e[ra]);
}
const gs = (e) => {
  const a = new Array(10), n = (i, t) => {
    if (Ue(i)) {
      if (a.indexOf(i) >= 0)
        return;
      if (qe(i))
        return i;
      if (!("toJSON" in i)) {
        a[t] = i;
        const s = Ee(i) ? [] : {};
        return Le(i, (o, c) => {
          const p = n(o, t + 1);
          !Te(p) && (s[c] = p);
        }), a[t] = void 0, s;
      }
    }
    return i;
  };
  return n(e, 0);
}, ys = J("AsyncFunction"), ws = (e) => e && (Ue(e) || I(e)) && I(e.then) && I(e.catch), Fi = ((e, a) => e ? setImmediate : a ? ((n, i) => (ce.addEventListener("message", ({ source: t, data: s }) => {
  t === ce && s === n && i.length && i.shift()();
}, !1), (t) => {
  i.push(t), ce.postMessage(n, "*");
}))(`axios@${Math.random()}`, []) : (n) => setTimeout(n))(
  typeof setImmediate == "function",
  I(ce.postMessage)
), ks = typeof queueMicrotask < "u" ? queueMicrotask.bind(ce) : typeof process < "u" && process.nextTick || Fi, _s = (e) => e != null && I(e[ra]), d = {
  isArray: Ee,
  isArrayBuffer: Ci,
  isBuffer: qe,
  isFormData: Kt,
  isArrayBufferView: $t,
  isString: It,
  isNumber: Ai,
  isBoolean: Dt,
  isObject: Ue,
  isPlainObject: Je,
  isEmptyObject: Mt,
  isReadableStream: Yt,
  isRequest: Qt,
  isResponse: Zt,
  isHeaders: es,
  isUndefined: Te,
  isDate: Ht,
  isFile: Gt,
  isBlob: Wt,
  isRegExp: ms,
  isFunction: I,
  isStream: Jt,
  isURLSearchParams: Xt,
  isTypedArray: cs,
  isFileList: Vt,
  forEach: Le,
  merge: Va,
  extend: ns,
  trim: as,
  stripBOM: is,
  inherits: ts,
  toFlatObject: ss,
  kindOf: ca,
  kindOfTest: J,
  endsWith: os,
  toArray: rs,
  forEachEntry: ps,
  matchAll: ls,
  isHTMLForm: us,
  hasOwnProperty: jn,
  hasOwnProp: jn,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors: Oi,
  freezeMethods: fs,
  toObjectSet: xs,
  toCamelCase: ds,
  noop: vs,
  toFiniteNumber: hs,
  findKey: ji,
  global: ce,
  isContextDefined: Ti,
  isSpecCompliantForm: bs,
  toJSONObject: gs,
  isAsyncFn: ys,
  isThenable: ws,
  setImmediate: Fi,
  asap: ks,
  isIterable: _s
};
function b(e, a, n, i, t) {
  Error.call(this), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack, this.message = e, this.name = "AxiosError", a && (this.code = a), n && (this.config = n), i && (this.request = i), t && (this.response = t, this.status = t.status ? t.status : null);
}
d.inherits(b, Error, {
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
      config: d.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
const Pi = b.prototype, qi = {};
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
].forEach((e) => {
  qi[e] = { value: e };
});
Object.defineProperties(b, qi);
Object.defineProperty(Pi, "isAxiosError", { value: !0 });
b.from = (e, a, n, i, t, s) => {
  const o = Object.create(Pi);
  return d.toFlatObject(e, o, function(p) {
    return p !== Error.prototype;
  }, (c) => c !== "isAxiosError"), b.call(o, e.message, a, n, i, t), o.cause = e, o.name = e.name, s && Object.assign(o, s), o;
};
function Ui(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Li = G.Stream, Ss = Se, Es = K;
function K() {
  this.source = null, this.dataSize = 0, this.maxDataSize = 1024 * 1024, this.pauseStream = !0, this._maxDataSizeExceeded = !1, this._released = !1, this._bufferedEvents = [];
}
Ss.inherits(K, Li);
K.create = function(e, a) {
  var n = new this();
  a = a || {};
  for (var i in a)
    n[i] = a[i];
  n.source = e;
  var t = e.emit;
  return e.emit = function() {
    return n._handleEmit(arguments), t.apply(e, arguments);
  }, e.on("error", function() {
  }), n.pauseStream && e.pause(), n;
};
Object.defineProperty(K.prototype, "readable", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    return this.source.readable;
  }
});
K.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};
K.prototype.resume = function() {
  this._released || this.release(), this.source.resume();
};
K.prototype.pause = function() {
  this.source.pause();
};
K.prototype.release = function() {
  this._released = !0, this._bufferedEvents.forEach((function(e) {
    this.emit.apply(this, e);
  }).bind(this)), this._bufferedEvents = [];
};
K.prototype.pipe = function() {
  var e = Li.prototype.pipe.apply(this, arguments);
  return this.resume(), e;
};
K.prototype._handleEmit = function(e) {
  if (this._released) {
    this.emit.apply(this, e);
    return;
  }
  e[0] === "data" && (this.dataSize += e[1].length, this._checkIfMaxDataSizeExceeded()), this._bufferedEvents.push(e);
};
K.prototype._checkIfMaxDataSizeExceeded = function() {
  if (!this._maxDataSizeExceeded && !(this.dataSize <= this.maxDataSize)) {
    this._maxDataSizeExceeded = !0;
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(e));
  }
};
var Rs = Se, Bi = G.Stream, Tn = Es, Cs = F;
function F() {
  this.writable = !1, this.readable = !0, this.dataSize = 0, this.maxDataSize = 2 * 1024 * 1024, this.pauseStreams = !0, this._released = !1, this._streams = [], this._currentStream = null, this._insideLoop = !1, this._pendingNext = !1;
}
Rs.inherits(F, Bi);
F.create = function(e) {
  var a = new this();
  e = e || {};
  for (var n in e)
    a[n] = e[n];
  return a;
};
F.isStreamLike = function(e) {
  return typeof e != "function" && typeof e != "string" && typeof e != "boolean" && typeof e != "number" && !Buffer.isBuffer(e);
};
F.prototype.append = function(e) {
  var a = F.isStreamLike(e);
  if (a) {
    if (!(e instanceof Tn)) {
      var n = Tn.create(e, {
        maxDataSize: 1 / 0,
        pauseStream: this.pauseStreams
      });
      e.on("data", this._checkDataSize.bind(this)), e = n;
    }
    this._handleErrors(e), this.pauseStreams && e.pause();
  }
  return this._streams.push(e), this;
};
F.prototype.pipe = function(e, a) {
  return Bi.prototype.pipe.call(this, e, a), this.resume(), e;
};
F.prototype._getNext = function() {
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
F.prototype._realGetNext = function() {
  var e = this._streams.shift();
  if (typeof e > "u") {
    this.end();
    return;
  }
  if (typeof e != "function") {
    this._pipeNext(e);
    return;
  }
  var a = e;
  a((function(n) {
    var i = F.isStreamLike(n);
    i && (n.on("data", this._checkDataSize.bind(this)), this._handleErrors(n)), this._pipeNext(n);
  }).bind(this));
};
F.prototype._pipeNext = function(e) {
  this._currentStream = e;
  var a = F.isStreamLike(e);
  if (a) {
    e.on("end", this._getNext.bind(this)), e.pipe(this, { end: !1 });
    return;
  }
  var n = e;
  this.write(n), this._getNext();
};
F.prototype._handleErrors = function(e) {
  var a = this;
  e.on("error", function(n) {
    a._emitError(n);
  });
};
F.prototype.write = function(e) {
  this.emit("data", e);
};
F.prototype.pause = function() {
  this.pauseStreams && (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function" && this._currentStream.pause(), this.emit("pause"));
};
F.prototype.resume = function() {
  this._released || (this._released = !0, this.writable = !0, this._getNext()), this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function" && this._currentStream.resume(), this.emit("resume");
};
F.prototype.end = function() {
  this._reset(), this.emit("end");
};
F.prototype.destroy = function() {
  this._reset(), this.emit("close");
};
F.prototype._reset = function() {
  this.writable = !1, this._streams = [], this._currentStream = null;
};
F.prototype._checkDataSize = function() {
  if (this._updateDataSize(), !(this.dataSize <= this.maxDataSize)) {
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(e));
  }
};
F.prototype._updateDataSize = function() {
  this.dataSize = 0;
  var e = this;
  this._streams.forEach(function(a) {
    a.dataSize && (e.dataSize += a.dataSize);
  }), this._currentStream && this._currentStream.dataSize && (this.dataSize += this._currentStream.dataSize);
};
F.prototype._emitError = function(e) {
  this._reset(), this.emit("error", e);
};
var zi = {};
const As = {
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
var js = As;
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(e) {
  var a = js, n = ki.extname, i = /^\s*([^;\s]*)(?:;|\s|$)/, t = /^text\//i;
  e.charset = s, e.charsets = { lookup: s }, e.contentType = o, e.extension = c, e.extensions = /* @__PURE__ */ Object.create(null), e.lookup = p, e.types = /* @__PURE__ */ Object.create(null), l(e.extensions, e.types);
  function s(r) {
    if (!r || typeof r != "string")
      return !1;
    var u = i.exec(r), m = u && a[u[1].toLowerCase()];
    return m && m.charset ? m.charset : u && t.test(u[1]) ? "UTF-8" : !1;
  }
  function o(r) {
    if (!r || typeof r != "string")
      return !1;
    var u = r.indexOf("/") === -1 ? e.lookup(r) : r;
    if (!u)
      return !1;
    if (u.indexOf("charset") === -1) {
      var m = e.charset(u);
      m && (u += "; charset=" + m.toLowerCase());
    }
    return u;
  }
  function c(r) {
    if (!r || typeof r != "string")
      return !1;
    var u = i.exec(r), m = u && e.extensions[u[1].toLowerCase()];
    return !m || !m.length ? !1 : m[0];
  }
  function p(r) {
    if (!r || typeof r != "string")
      return !1;
    var u = n("x." + r).toLowerCase().substr(1);
    return u && e.types[u] || !1;
  }
  function l(r, u) {
    var m = ["nginx", "apache", void 0, "iana"];
    Object.keys(a).forEach(function(f) {
      var v = a[f], h = v.extensions;
      if (!(!h || !h.length)) {
        r[f] = h;
        for (var g = 0; g < h.length; g++) {
          var w = h[g];
          if (u[w]) {
            var y = m.indexOf(a[u[w]].source), T = m.indexOf(v.source);
            if (u[w] !== "application/octet-stream" && (y > T || y === T && u[w].substr(0, 12) === "application/"))
              continue;
          }
          u[w] = f;
        }
      }
    });
  }
})(zi);
var Ts = Os;
function Os(e) {
  var a = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
  a ? a(e) : setTimeout(e, 0);
}
var On = Ts, Ni = Fs;
function Fs(e) {
  var a = !1;
  return On(function() {
    a = !0;
  }), function(i, t) {
    a ? e(i, t) : On(function() {
      e(i, t);
    });
  };
}
var $i = Ps;
function Ps(e) {
  Object.keys(e.jobs).forEach(qs.bind(e)), e.jobs = {};
}
function qs(e) {
  typeof this.jobs[e] == "function" && this.jobs[e]();
}
var Fn = Ni, Us = $i, Ii = Ls;
function Ls(e, a, n, i) {
  var t = n.keyedList ? n.keyedList[n.index] : n.index;
  n.jobs[t] = Bs(a, t, e[t], function(s, o) {
    t in n.jobs && (delete n.jobs[t], s ? Us(n) : n.results[t] = o, i(s, n.results));
  });
}
function Bs(e, a, n, i) {
  var t;
  return e.length == 2 ? t = e(n, Fn(i)) : t = e(n, a, Fn(i)), t;
}
var Di = zs;
function zs(e, a) {
  var n = !Array.isArray(e), i = {
    index: 0,
    keyedList: n || a ? Object.keys(e) : null,
    jobs: {},
    results: n ? {} : [],
    size: n ? Object.keys(e).length : e.length
  };
  return a && i.keyedList.sort(n ? a : function(t, s) {
    return a(e[t], e[s]);
  }), i;
}
var Ns = $i, $s = Ni, Mi = Is;
function Is(e) {
  Object.keys(this.jobs).length && (this.index = this.size, Ns(this), $s(e)(null, this.results));
}
var Ds = Ii, Ms = Di, Hs = Mi, Gs = Ws;
function Ws(e, a, n) {
  for (var i = Ms(e); i.index < (i.keyedList || e).length; )
    Ds(e, a, i, function(t, s) {
      if (t) {
        n(t, s);
        return;
      }
      if (Object.keys(i.jobs).length === 0) {
        n(null, i.results);
        return;
      }
    }), i.index++;
  return Hs.bind(i, n);
}
var la = { exports: {} }, Pn = Ii, Vs = Di, Js = Mi;
la.exports = Ks;
la.exports.ascending = Hi;
la.exports.descending = Xs;
function Ks(e, a, n, i) {
  var t = Vs(e, n);
  return Pn(e, a, t, function s(o, c) {
    if (o) {
      i(o, c);
      return;
    }
    if (t.index++, t.index < (t.keyedList || e).length) {
      Pn(e, a, t, s);
      return;
    }
    i(null, t.results);
  }), Js.bind(t, i);
}
function Hi(e, a) {
  return e < a ? -1 : e > a ? 1 : 0;
}
function Xs(e, a) {
  return -1 * Hi(e, a);
}
var Gi = la.exports, Ys = Gi, Qs = Zs;
function Zs(e, a, n) {
  return Ys(e, a, null, n);
}
var eo = {
  parallel: Gs,
  serial: Qs,
  serialOrdered: Gi
}, Wi = Object, ao = Error, no = EvalError, io = RangeError, to = ReferenceError, so = SyntaxError, cn = TypeError, oo = URIError, ro = Math.abs, co = Math.floor, po = Math.max, lo = Math.min, uo = Math.pow, mo = Math.round, fo = Number.isNaN || function(a) {
  return a !== a;
}, xo = fo, vo = function(a) {
  return xo(a) || a === 0 ? a : a < 0 ? -1 : 1;
}, ho = Object.getOwnPropertyDescriptor, Ke = ho;
if (Ke)
  try {
    Ke([], "length");
  } catch {
    Ke = null;
  }
var Vi = Ke, Xe = Object.defineProperty || !1;
if (Xe)
  try {
    Xe({}, "a", { value: 1 });
  } catch {
    Xe = !1;
  }
var bo = Xe, ya, qn;
function Ji() {
  return qn || (qn = 1, ya = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var a = {}, n = Symbol("test"), i = Object(n);
    if (typeof n == "string" || Object.prototype.toString.call(n) !== "[object Symbol]" || Object.prototype.toString.call(i) !== "[object Symbol]")
      return !1;
    var t = 42;
    a[n] = t;
    for (var s in a)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(a).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(a).length !== 0)
      return !1;
    var o = Object.getOwnPropertySymbols(a);
    if (o.length !== 1 || o[0] !== n || !Object.prototype.propertyIsEnumerable.call(a, n))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var c = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(a, n)
      );
      if (c.value !== t || c.enumerable !== !0)
        return !1;
    }
    return !0;
  }), ya;
}
var wa, Un;
function go() {
  if (Un) return wa;
  Un = 1;
  var e = typeof Symbol < "u" && Symbol, a = Ji();
  return wa = function() {
    return typeof e != "function" || typeof Symbol != "function" || typeof e("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : a();
  }, wa;
}
var ka, Ln;
function Ki() {
  return Ln || (Ln = 1, ka = typeof Reflect < "u" && Reflect.getPrototypeOf || null), ka;
}
var _a, Bn;
function Xi() {
  if (Bn) return _a;
  Bn = 1;
  var e = Wi;
  return _a = e.getPrototypeOf || null, _a;
}
var yo = "Function.prototype.bind called on incompatible ", wo = Object.prototype.toString, ko = Math.max, _o = "[object Function]", zn = function(a, n) {
  for (var i = [], t = 0; t < a.length; t += 1)
    i[t] = a[t];
  for (var s = 0; s < n.length; s += 1)
    i[s + a.length] = n[s];
  return i;
}, So = function(a, n) {
  for (var i = [], t = n, s = 0; t < a.length; t += 1, s += 1)
    i[s] = a[t];
  return i;
}, Eo = function(e, a) {
  for (var n = "", i = 0; i < e.length; i += 1)
    n += e[i], i + 1 < e.length && (n += a);
  return n;
}, Ro = function(a) {
  var n = this;
  if (typeof n != "function" || wo.apply(n) !== _o)
    throw new TypeError(yo + n);
  for (var i = So(arguments, 1), t, s = function() {
    if (this instanceof t) {
      var r = n.apply(
        this,
        zn(i, arguments)
      );
      return Object(r) === r ? r : this;
    }
    return n.apply(
      a,
      zn(i, arguments)
    );
  }, o = ko(0, n.length - i.length), c = [], p = 0; p < o; p++)
    c[p] = "$" + p;
  if (t = Function("binder", "return function (" + Eo(c, ",") + "){ return binder.apply(this,arguments); }")(s), n.prototype) {
    var l = function() {
    };
    l.prototype = n.prototype, t.prototype = new l(), l.prototype = null;
  }
  return t;
}, Co = Ro, ua = Function.prototype.bind || Co, Sa, Nn;
function pn() {
  return Nn || (Nn = 1, Sa = Function.prototype.call), Sa;
}
var Ea, $n;
function Yi() {
  return $n || ($n = 1, Ea = Function.prototype.apply), Ea;
}
var Ra, In;
function Ao() {
  return In || (In = 1, Ra = typeof Reflect < "u" && Reflect && Reflect.apply), Ra;
}
var Ca, Dn;
function jo() {
  if (Dn) return Ca;
  Dn = 1;
  var e = ua, a = Yi(), n = pn(), i = Ao();
  return Ca = i || e.call(n, a), Ca;
}
var Aa, Mn;
function To() {
  if (Mn) return Aa;
  Mn = 1;
  var e = ua, a = cn, n = pn(), i = jo();
  return Aa = function(s) {
    if (s.length < 1 || typeof s[0] != "function")
      throw new a("a function is required");
    return i(e, n, s);
  }, Aa;
}
var ja, Hn;
function Oo() {
  if (Hn) return ja;
  Hn = 1;
  var e = To(), a = Vi, n;
  try {
    n = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (o) {
    if (!o || typeof o != "object" || !("code" in o) || o.code !== "ERR_PROTO_ACCESS")
      throw o;
  }
  var i = !!n && a && a(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), t = Object, s = t.getPrototypeOf;
  return ja = i && typeof i.get == "function" ? e([i.get]) : typeof s == "function" ? (
    /** @type {import('./get')} */
    function(c) {
      return s(c == null ? c : t(c));
    }
  ) : !1, ja;
}
var Ta, Gn;
function Fo() {
  if (Gn) return Ta;
  Gn = 1;
  var e = Ki(), a = Xi(), n = Oo();
  return Ta = e ? function(t) {
    return e(t);
  } : a ? function(t) {
    if (!t || typeof t != "object" && typeof t != "function")
      throw new TypeError("getProto: not an object");
    return a(t);
  } : n ? function(t) {
    return n(t);
  } : null, Ta;
}
var Po = Function.prototype.call, qo = Object.prototype.hasOwnProperty, Uo = ua, ln = Uo.call(Po, qo), S, Lo = Wi, Bo = ao, zo = no, No = io, $o = to, ke = so, ye = cn, Io = oo, Do = ro, Mo = co, Ho = po, Go = lo, Wo = uo, Vo = mo, Jo = vo, Qi = Function, Oa = function(e) {
  try {
    return Qi('"use strict"; return (' + e + ").constructor;")();
  } catch {
  }
}, Oe = Vi, Ko = bo, Fa = function() {
  throw new ye();
}, Xo = Oe ? function() {
  try {
    return arguments.callee, Fa;
  } catch {
    try {
      return Oe(arguments, "callee").get;
    } catch {
      return Fa;
    }
  }
}() : Fa, ve = go()(), q = Fo(), Yo = Xi(), Qo = Ki(), Zi = Yi(), Be = pn(), he = {}, Zo = typeof Uint8Array > "u" || !q ? S : q(Uint8Array), le = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError > "u" ? S : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer > "u" ? S : ArrayBuffer,
  "%ArrayIteratorPrototype%": ve && q ? q([][Symbol.iterator]()) : S,
  "%AsyncFromSyncIteratorPrototype%": S,
  "%AsyncFunction%": he,
  "%AsyncGenerator%": he,
  "%AsyncGeneratorFunction%": he,
  "%AsyncIteratorPrototype%": he,
  "%Atomics%": typeof Atomics > "u" ? S : Atomics,
  "%BigInt%": typeof BigInt > "u" ? S : BigInt,
  "%BigInt64Array%": typeof BigInt64Array > "u" ? S : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array > "u" ? S : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView > "u" ? S : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": Bo,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": zo,
  "%Float16Array%": typeof Float16Array > "u" ? S : Float16Array,
  "%Float32Array%": typeof Float32Array > "u" ? S : Float32Array,
  "%Float64Array%": typeof Float64Array > "u" ? S : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? S : FinalizationRegistry,
  "%Function%": Qi,
  "%GeneratorFunction%": he,
  "%Int8Array%": typeof Int8Array > "u" ? S : Int8Array,
  "%Int16Array%": typeof Int16Array > "u" ? S : Int16Array,
  "%Int32Array%": typeof Int32Array > "u" ? S : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": ve && q ? q(q([][Symbol.iterator]())) : S,
  "%JSON%": typeof JSON == "object" ? JSON : S,
  "%Map%": typeof Map > "u" ? S : Map,
  "%MapIteratorPrototype%": typeof Map > "u" || !ve || !q ? S : q((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": Lo,
  "%Object.getOwnPropertyDescriptor%": Oe,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise > "u" ? S : Promise,
  "%Proxy%": typeof Proxy > "u" ? S : Proxy,
  "%RangeError%": No,
  "%ReferenceError%": $o,
  "%Reflect%": typeof Reflect > "u" ? S : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set > "u" ? S : Set,
  "%SetIteratorPrototype%": typeof Set > "u" || !ve || !q ? S : q((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? S : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": ve && q ? q(""[Symbol.iterator]()) : S,
  "%Symbol%": ve ? Symbol : S,
  "%SyntaxError%": ke,
  "%ThrowTypeError%": Xo,
  "%TypedArray%": Zo,
  "%TypeError%": ye,
  "%Uint8Array%": typeof Uint8Array > "u" ? S : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? S : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array > "u" ? S : Uint16Array,
  "%Uint32Array%": typeof Uint32Array > "u" ? S : Uint32Array,
  "%URIError%": Io,
  "%WeakMap%": typeof WeakMap > "u" ? S : WeakMap,
  "%WeakRef%": typeof WeakRef > "u" ? S : WeakRef,
  "%WeakSet%": typeof WeakSet > "u" ? S : WeakSet,
  "%Function.prototype.call%": Be,
  "%Function.prototype.apply%": Zi,
  "%Object.defineProperty%": Ko,
  "%Object.getPrototypeOf%": Yo,
  "%Math.abs%": Do,
  "%Math.floor%": Mo,
  "%Math.max%": Ho,
  "%Math.min%": Go,
  "%Math.pow%": Wo,
  "%Math.round%": Vo,
  "%Math.sign%": Jo,
  "%Reflect.getPrototypeOf%": Qo
};
if (q)
  try {
    null.error;
  } catch (e) {
    var er = q(q(e));
    le["%Error.prototype%"] = er;
  }
var ar = function e(a) {
  var n;
  if (a === "%AsyncFunction%")
    n = Oa("async function () {}");
  else if (a === "%GeneratorFunction%")
    n = Oa("function* () {}");
  else if (a === "%AsyncGeneratorFunction%")
    n = Oa("async function* () {}");
  else if (a === "%AsyncGenerator%") {
    var i = e("%AsyncGeneratorFunction%");
    i && (n = i.prototype);
  } else if (a === "%AsyncIteratorPrototype%") {
    var t = e("%AsyncGenerator%");
    t && q && (n = q(t.prototype));
  }
  return le[a] = n, n;
}, Wn = {
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
}, ze = ua, Ze = ln, nr = ze.call(Be, Array.prototype.concat), ir = ze.call(Zi, Array.prototype.splice), Vn = ze.call(Be, String.prototype.replace), ea = ze.call(Be, String.prototype.slice), tr = ze.call(Be, RegExp.prototype.exec), sr = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, or = /\\(\\)?/g, rr = function(a) {
  var n = ea(a, 0, 1), i = ea(a, -1);
  if (n === "%" && i !== "%")
    throw new ke("invalid intrinsic syntax, expected closing `%`");
  if (i === "%" && n !== "%")
    throw new ke("invalid intrinsic syntax, expected opening `%`");
  var t = [];
  return Vn(a, sr, function(s, o, c, p) {
    t[t.length] = c ? Vn(p, or, "$1") : o || s;
  }), t;
}, cr = function(a, n) {
  var i = a, t;
  if (Ze(Wn, i) && (t = Wn[i], i = "%" + t[0] + "%"), Ze(le, i)) {
    var s = le[i];
    if (s === he && (s = ar(i)), typeof s > "u" && !n)
      throw new ye("intrinsic " + a + " exists, but is not available. Please file an issue!");
    return {
      alias: t,
      name: i,
      value: s
    };
  }
  throw new ke("intrinsic " + a + " does not exist!");
}, pr = function(a, n) {
  if (typeof a != "string" || a.length === 0)
    throw new ye("intrinsic name must be a non-empty string");
  if (arguments.length > 1 && typeof n != "boolean")
    throw new ye('"allowMissing" argument must be a boolean');
  if (tr(/^%?[^%]*%?$/, a) === null)
    throw new ke("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  var i = rr(a), t = i.length > 0 ? i[0] : "", s = cr("%" + t + "%", n), o = s.name, c = s.value, p = !1, l = s.alias;
  l && (t = l[0], ir(i, nr([0, 1], l)));
  for (var r = 1, u = !0; r < i.length; r += 1) {
    var m = i[r], x = ea(m, 0, 1), f = ea(m, -1);
    if ((x === '"' || x === "'" || x === "`" || f === '"' || f === "'" || f === "`") && x !== f)
      throw new ke("property names with quotes must have matching quotes");
    if ((m === "constructor" || !u) && (p = !0), t += "." + m, o = "%" + t + "%", Ze(le, o))
      c = le[o];
    else if (c != null) {
      if (!(m in c)) {
        if (!n)
          throw new ye("base intrinsic for " + a + " exists, but the property is not available.");
        return;
      }
      if (Oe && r + 1 >= i.length) {
        var v = Oe(c, m);
        u = !!v, u && "get" in v && !("originalValue" in v.get) ? c = v.get : c = c[m];
      } else
        u = Ze(c, m), c = c[m];
      u && !p && (le[o] = c);
    }
  }
  return c;
}, Pa, Jn;
function lr() {
  if (Jn) return Pa;
  Jn = 1;
  var e = Ji();
  return Pa = function() {
    return e() && !!Symbol.toStringTag;
  }, Pa;
}
var ur = pr, Kn = ur("%Object.defineProperty%", !0), dr = lr()(), mr = ln, fr = cn, Me = dr ? Symbol.toStringTag : null, xr = function(a, n) {
  var i = arguments.length > 2 && !!arguments[2] && arguments[2].force, t = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
  if (typeof i < "u" && typeof i != "boolean" || typeof t < "u" && typeof t != "boolean")
    throw new fr("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
  Me && (i || !mr(a, Me)) && (Kn ? Kn(a, Me, {
    configurable: !t,
    enumerable: !1,
    value: n,
    writable: !1
  }) : a[Me] = n);
}, vr = function(e, a) {
  return Object.keys(a).forEach(function(n) {
    e[n] = e[n] || a[n];
  }), e;
}, un = Cs, hr = Se, qa = ki, br = sn, gr = on, yr = oa.parse, wr = Ut, kr = G.Stream, _r = _i, Ua = zi, Sr = eo, Er = xr, ne = ln, Ja = vr;
function E(e) {
  if (!(this instanceof E))
    return new E(e);
  this._overheadLength = 0, this._valueLength = 0, this._valuesToMeasure = [], un.call(this), e = e || {};
  for (var a in e)
    this[a] = e[a];
}
hr.inherits(E, un);
E.LINE_BREAK = `\r
`;
E.DEFAULT_CONTENT_TYPE = "application/octet-stream";
E.prototype.append = function(e, a, n) {
  n = n || {}, typeof n == "string" && (n = { filename: n });
  var i = un.prototype.append.bind(this);
  if ((typeof a == "number" || a == null) && (a = String(a)), Array.isArray(a)) {
    this._error(new Error("Arrays are not supported."));
    return;
  }
  var t = this._multiPartHeader(e, a, n), s = this._multiPartFooter();
  i(t), i(a), i(s), this._trackLength(t, a, n);
};
E.prototype._trackLength = function(e, a, n) {
  var i = 0;
  n.knownLength != null ? i += Number(n.knownLength) : Buffer.isBuffer(a) ? i = a.length : typeof a == "string" && (i = Buffer.byteLength(a)), this._valueLength += i, this._overheadLength += Buffer.byteLength(e) + E.LINE_BREAK.length, !(!a || !a.path && !(a.readable && ne(a, "httpVersion")) && !(a instanceof kr)) && (n.knownLength || this._valuesToMeasure.push(a));
};
E.prototype._lengthRetriever = function(e, a) {
  ne(e, "fd") ? e.end != null && e.end != 1 / 0 && e.start != null ? a(null, e.end + 1 - (e.start ? e.start : 0)) : wr.stat(e.path, function(n, i) {
    if (n) {
      a(n);
      return;
    }
    var t = i.size - (e.start ? e.start : 0);
    a(null, t);
  }) : ne(e, "httpVersion") ? a(null, Number(e.headers["content-length"])) : ne(e, "httpModule") ? (e.on("response", function(n) {
    e.pause(), a(null, Number(n.headers["content-length"]));
  }), e.resume()) : a("Unknown stream");
};
E.prototype._multiPartHeader = function(e, a, n) {
  if (typeof n.header == "string")
    return n.header;
  var i = this._getContentDisposition(a, n), t = this._getContentType(a, n), s = "", o = {
    // add custom disposition as third element or keep it two elements if not
    "Content-Disposition": ["form-data", 'name="' + e + '"'].concat(i || []),
    // if no content type. allow it to be empty array
    "Content-Type": [].concat(t || [])
  };
  typeof n.header == "object" && Ja(o, n.header);
  var c;
  for (var p in o)
    if (ne(o, p)) {
      if (c = o[p], c == null)
        continue;
      Array.isArray(c) || (c = [c]), c.length && (s += p + ": " + c.join("; ") + E.LINE_BREAK);
    }
  return "--" + this.getBoundary() + E.LINE_BREAK + s + E.LINE_BREAK;
};
E.prototype._getContentDisposition = function(e, a) {
  var n;
  if (typeof a.filepath == "string" ? n = qa.normalize(a.filepath).replace(/\\/g, "/") : a.filename || e && (e.name || e.path) ? n = qa.basename(a.filename || e && (e.name || e.path)) : e && e.readable && ne(e, "httpVersion") && (n = qa.basename(e.client._httpMessage.path || "")), n)
    return 'filename="' + n + '"';
};
E.prototype._getContentType = function(e, a) {
  var n = a.contentType;
  return !n && e && e.name && (n = Ua.lookup(e.name)), !n && e && e.path && (n = Ua.lookup(e.path)), !n && e && e.readable && ne(e, "httpVersion") && (n = e.headers["content-type"]), !n && (a.filepath || a.filename) && (n = Ua.lookup(a.filepath || a.filename)), !n && e && typeof e == "object" && (n = E.DEFAULT_CONTENT_TYPE), n;
};
E.prototype._multiPartFooter = function() {
  return (function(e) {
    var a = E.LINE_BREAK, n = this._streams.length === 0;
    n && (a += this._lastBoundary()), e(a);
  }).bind(this);
};
E.prototype._lastBoundary = function() {
  return "--" + this.getBoundary() + "--" + E.LINE_BREAK;
};
E.prototype.getHeaders = function(e) {
  var a, n = {
    "content-type": "multipart/form-data; boundary=" + this.getBoundary()
  };
  for (a in e)
    ne(e, a) && (n[a.toLowerCase()] = e[a]);
  return n;
};
E.prototype.setBoundary = function(e) {
  if (typeof e != "string")
    throw new TypeError("FormData boundary must be a string");
  this._boundary = e;
};
E.prototype.getBoundary = function() {
  return this._boundary || this._generateBoundary(), this._boundary;
};
E.prototype.getBuffer = function() {
  for (var e = new Buffer.alloc(0), a = this.getBoundary(), n = 0, i = this._streams.length; n < i; n++)
    typeof this._streams[n] != "function" && (Buffer.isBuffer(this._streams[n]) ? e = Buffer.concat([e, this._streams[n]]) : e = Buffer.concat([e, Buffer.from(this._streams[n])]), (typeof this._streams[n] != "string" || this._streams[n].substring(2, a.length + 2) !== a) && (e = Buffer.concat([e, Buffer.from(E.LINE_BREAK)])));
  return Buffer.concat([e, Buffer.from(this._lastBoundary())]);
};
E.prototype._generateBoundary = function() {
  this._boundary = "--------------------------" + _r.randomBytes(12).toString("hex");
};
E.prototype.getLengthSync = function() {
  var e = this._overheadLength + this._valueLength;
  return this._streams.length && (e += this._lastBoundary().length), this.hasKnownLength() || this._error(new Error("Cannot calculate proper length in synchronous way.")), e;
};
E.prototype.hasKnownLength = function() {
  var e = !0;
  return this._valuesToMeasure.length && (e = !1), e;
};
E.prototype.getLength = function(e) {
  var a = this._overheadLength + this._valueLength;
  if (this._streams.length && (a += this._lastBoundary().length), !this._valuesToMeasure.length) {
    process.nextTick(e.bind(this, null, a));
    return;
  }
  Sr.parallel(this._valuesToMeasure, this._lengthRetriever, function(n, i) {
    if (n) {
      e(n);
      return;
    }
    i.forEach(function(t) {
      a += t;
    }), e(null, a);
  });
};
E.prototype.submit = function(e, a) {
  var n, i, t = { method: "post" };
  return typeof e == "string" ? (e = yr(e), i = Ja({
    port: e.port,
    path: e.pathname,
    host: e.hostname,
    protocol: e.protocol
  }, t)) : (i = Ja(e, t), i.port || (i.port = i.protocol === "https:" ? 443 : 80)), i.headers = this.getHeaders(e.headers), i.protocol === "https:" ? n = gr.request(i) : n = br.request(i), this.getLength((function(s, o) {
    if (s && s !== "Unknown stream") {
      this._error(s);
      return;
    }
    if (o && n.setHeader("Content-Length", o), this.pipe(n), a) {
      var c, p = function(l, r) {
        return n.removeListener("error", p), n.removeListener("response", c), a.call(this, l, r);
      };
      c = p.bind(this, null), n.on("error", p), n.on("response", c);
    }
  }).bind(this)), n;
};
E.prototype._error = function(e) {
  this.error || (this.error = e, this.pause(), this.emit("error", e));
};
E.prototype.toString = function() {
  return "[object FormData]";
};
Er(E, "FormData");
var Rr = E;
const et = /* @__PURE__ */ Ui(Rr);
function Ka(e) {
  return d.isPlainObject(e) || d.isArray(e);
}
function at(e) {
  return d.endsWith(e, "[]") ? e.slice(0, -2) : e;
}
function Xn(e, a, n) {
  return e ? e.concat(a).map(function(t, s) {
    return t = at(t), !n && s ? "[" + t + "]" : t;
  }).join(n ? "." : "") : a;
}
function Cr(e) {
  return d.isArray(e) && !e.some(Ka);
}
const Ar = d.toFlatObject(d, {}, null, function(a) {
  return /^is[A-Z]/.test(a);
});
function da(e, a, n) {
  if (!d.isObject(e))
    throw new TypeError("target must be an object");
  a = a || new (et || FormData)(), n = d.toFlatObject(n, {
    metaTokens: !0,
    dots: !1,
    indexes: !1
  }, !1, function(v, h) {
    return !d.isUndefined(h[v]);
  });
  const i = n.metaTokens, t = n.visitor || r, s = n.dots, o = n.indexes, p = (n.Blob || typeof Blob < "u" && Blob) && d.isSpecCompliantForm(a);
  if (!d.isFunction(t))
    throw new TypeError("visitor must be a function");
  function l(f) {
    if (f === null) return "";
    if (d.isDate(f))
      return f.toISOString();
    if (d.isBoolean(f))
      return f.toString();
    if (!p && d.isBlob(f))
      throw new b("Blob is not supported. Use a Buffer instead.");
    return d.isArrayBuffer(f) || d.isTypedArray(f) ? p && typeof Blob == "function" ? new Blob([f]) : Buffer.from(f) : f;
  }
  function r(f, v, h) {
    let g = f;
    if (f && !h && typeof f == "object") {
      if (d.endsWith(v, "{}"))
        v = i ? v : v.slice(0, -2), f = JSON.stringify(f);
      else if (d.isArray(f) && Cr(f) || (d.isFileList(f) || d.endsWith(v, "[]")) && (g = d.toArray(f)))
        return v = at(v), g.forEach(function(y, T) {
          !(d.isUndefined(y) || y === null) && a.append(
            // eslint-disable-next-line no-nested-ternary
            o === !0 ? Xn([v], T, s) : o === null ? v : v + "[]",
            l(y)
          );
        }), !1;
    }
    return Ka(f) ? !0 : (a.append(Xn(h, v, s), l(f)), !1);
  }
  const u = [], m = Object.assign(Ar, {
    defaultVisitor: r,
    convertValue: l,
    isVisitable: Ka
  });
  function x(f, v) {
    if (!d.isUndefined(f)) {
      if (u.indexOf(f) !== -1)
        throw Error("Circular reference detected in " + v.join("."));
      u.push(f), d.forEach(f, function(g, w) {
        (!(d.isUndefined(g) || g === null) && t.call(
          a,
          g,
          d.isString(w) ? w.trim() : w,
          v,
          m
        )) === !0 && x(g, v ? v.concat(w) : [w]);
      }), u.pop();
    }
  }
  if (!d.isObject(e))
    throw new TypeError("data must be an object");
  return x(e), a;
}
function Yn(e) {
  const a = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(e).replace(/[!'()~]|%20|%00/g, function(i) {
    return a[i];
  });
}
function nt(e, a) {
  this._pairs = [], e && da(e, this, a);
}
const it = nt.prototype;
it.append = function(a, n) {
  this._pairs.push([a, n]);
};
it.toString = function(a) {
  const n = a ? function(i) {
    return a.call(this, i, Yn);
  } : Yn;
  return this._pairs.map(function(t) {
    return n(t[0]) + "=" + n(t[1]);
  }, "").join("&");
};
function jr(e) {
  return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
function dn(e, a, n) {
  if (!a)
    return e;
  const i = n && n.encode || jr;
  d.isFunction(n) && (n = {
    serialize: n
  });
  const t = n && n.serialize;
  let s;
  if (t ? s = t(a, n) : s = d.isURLSearchParams(a) ? a.toString() : new nt(a, n).toString(i), s) {
    const o = e.indexOf("#");
    o !== -1 && (e = e.slice(0, o)), e += (e.indexOf("?") === -1 ? "?" : "&") + s;
  }
  return e;
}
class Qn {
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
  use(a, n, i) {
    return this.handlers.push({
      fulfilled: a,
      rejected: n,
      synchronous: i ? i.synchronous : !1,
      runWhen: i ? i.runWhen : null
    }), this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(a) {
    this.handlers[a] && (this.handlers[a] = null);
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
  forEach(a) {
    d.forEach(this.handlers, function(i) {
      i !== null && a(i);
    });
  }
}
const mn = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1
}, Tr = oa.URLSearchParams, La = "abcdefghijklmnopqrstuvwxyz", Zn = "0123456789", tt = {
  DIGIT: Zn,
  ALPHA: La,
  ALPHA_DIGIT: La + La.toUpperCase() + Zn
}, Or = (e = 16, a = tt.ALPHA_DIGIT) => {
  let n = "";
  const { length: i } = a, t = new Uint32Array(e);
  _i.randomFillSync(t);
  for (let s = 0; s < e; s++)
    n += a[t[s] % i];
  return n;
}, Fr = {
  isNode: !0,
  classes: {
    URLSearchParams: Tr,
    FormData: et,
    Blob: typeof Blob < "u" && Blob || null
  },
  ALPHABET: tt,
  generateString: Or,
  protocols: ["http", "https", "file", "data"]
}, fn = typeof window < "u" && typeof document < "u", Xa = typeof navigator == "object" && navigator || void 0, Pr = fn && (!Xa || ["ReactNative", "NativeScript", "NS"].indexOf(Xa.product) < 0), qr = typeof WorkerGlobalScope < "u" && // eslint-disable-next-line no-undef
self instanceof WorkerGlobalScope && typeof self.importScripts == "function", Ur = fn && window.location.href || "http://localhost", Lr = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv: fn,
  hasStandardBrowserEnv: Pr,
  hasStandardBrowserWebWorkerEnv: qr,
  navigator: Xa,
  origin: Ur
}, Symbol.toStringTag, { value: "Module" })), O = {
  ...Lr,
  ...Fr
};
function Br(e, a) {
  return da(e, new O.classes.URLSearchParams(), {
    visitor: function(n, i, t, s) {
      return O.isNode && d.isBuffer(n) ? (this.append(i, n.toString("base64")), !1) : s.defaultVisitor.apply(this, arguments);
    },
    ...a
  });
}
function zr(e) {
  return d.matchAll(/\w+|\[(\w*)]/g, e).map((a) => a[0] === "[]" ? "" : a[1] || a[0]);
}
function Nr(e) {
  const a = {}, n = Object.keys(e);
  let i;
  const t = n.length;
  let s;
  for (i = 0; i < t; i++)
    s = n[i], a[s] = e[s];
  return a;
}
function st(e) {
  function a(n, i, t, s) {
    let o = n[s++];
    if (o === "__proto__") return !0;
    const c = Number.isFinite(+o), p = s >= n.length;
    return o = !o && d.isArray(t) ? t.length : o, p ? (d.hasOwnProp(t, o) ? t[o] = [t[o], i] : t[o] = i, !c) : ((!t[o] || !d.isObject(t[o])) && (t[o] = []), a(n, i, t[o], s) && d.isArray(t[o]) && (t[o] = Nr(t[o])), !c);
  }
  if (d.isFormData(e) && d.isFunction(e.entries)) {
    const n = {};
    return d.forEachEntry(e, (i, t) => {
      a(zr(i), t, n, 0);
    }), n;
  }
  return null;
}
function $r(e, a, n) {
  if (d.isString(e))
    try {
      return (a || JSON.parse)(e), d.trim(e);
    } catch (i) {
      if (i.name !== "SyntaxError")
        throw i;
    }
  return (n || JSON.stringify)(e);
}
const Ne = {
  transitional: mn,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function(a, n) {
    const i = n.getContentType() || "", t = i.indexOf("application/json") > -1, s = d.isObject(a);
    if (s && d.isHTMLForm(a) && (a = new FormData(a)), d.isFormData(a))
      return t ? JSON.stringify(st(a)) : a;
    if (d.isArrayBuffer(a) || d.isBuffer(a) || d.isStream(a) || d.isFile(a) || d.isBlob(a) || d.isReadableStream(a))
      return a;
    if (d.isArrayBufferView(a))
      return a.buffer;
    if (d.isURLSearchParams(a))
      return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), a.toString();
    let c;
    if (s) {
      if (i.indexOf("application/x-www-form-urlencoded") > -1)
        return Br(a, this.formSerializer).toString();
      if ((c = d.isFileList(a)) || i.indexOf("multipart/form-data") > -1) {
        const p = this.env && this.env.FormData;
        return da(
          c ? { "files[]": a } : a,
          p && new p(),
          this.formSerializer
        );
      }
    }
    return s || t ? (n.setContentType("application/json", !1), $r(a)) : a;
  }],
  transformResponse: [function(a) {
    const n = this.transitional || Ne.transitional, i = n && n.forcedJSONParsing, t = this.responseType === "json";
    if (d.isResponse(a) || d.isReadableStream(a))
      return a;
    if (a && d.isString(a) && (i && !this.responseType || t)) {
      const o = !(n && n.silentJSONParsing) && t;
      try {
        return JSON.parse(a);
      } catch (c) {
        if (o)
          throw c.name === "SyntaxError" ? b.from(c, b.ERR_BAD_RESPONSE, this, null, this.response) : c;
      }
    }
    return a;
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
    FormData: O.classes.FormData,
    Blob: O.classes.Blob
  },
  validateStatus: function(a) {
    return a >= 200 && a < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
d.forEach(["delete", "get", "head", "post", "put", "patch"], (e) => {
  Ne.headers[e] = {};
});
const Ir = d.toObjectSet([
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
]), Dr = (e) => {
  const a = {};
  let n, i, t;
  return e && e.split(`
`).forEach(function(o) {
    t = o.indexOf(":"), n = o.substring(0, t).trim().toLowerCase(), i = o.substring(t + 1).trim(), !(!n || a[n] && Ir[n]) && (n === "set-cookie" ? a[n] ? a[n].push(i) : a[n] = [i] : a[n] = a[n] ? a[n] + ", " + i : i);
  }), a;
}, ei = Symbol("internals");
function Ce(e) {
  return e && String(e).trim().toLowerCase();
}
function Ye(e) {
  return e === !1 || e == null ? e : d.isArray(e) ? e.map(Ye) : String(e);
}
function Mr(e) {
  const a = /* @__PURE__ */ Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let i;
  for (; i = n.exec(e); )
    a[i[1]] = i[2];
  return a;
}
const Hr = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
function Ba(e, a, n, i, t) {
  if (d.isFunction(i))
    return i.call(this, a, n);
  if (t && (a = n), !!d.isString(a)) {
    if (d.isString(i))
      return a.indexOf(i) !== -1;
    if (d.isRegExp(i))
      return i.test(a);
  }
}
function Gr(e) {
  return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (a, n, i) => n.toUpperCase() + i);
}
function Wr(e, a) {
  const n = d.toCamelCase(" " + a);
  ["get", "set", "has"].forEach((i) => {
    Object.defineProperty(e, i + n, {
      value: function(t, s, o) {
        return this[i].call(this, a, t, s, o);
      },
      configurable: !0
    });
  });
}
let L = class {
  constructor(a) {
    a && this.set(a);
  }
  set(a, n, i) {
    const t = this;
    function s(c, p, l) {
      const r = Ce(p);
      if (!r)
        throw new Error("header name must be a non-empty string");
      const u = d.findKey(t, r);
      (!u || t[u] === void 0 || l === !0 || l === void 0 && t[u] !== !1) && (t[u || p] = Ye(c));
    }
    const o = (c, p) => d.forEach(c, (l, r) => s(l, r, p));
    if (d.isPlainObject(a) || a instanceof this.constructor)
      o(a, n);
    else if (d.isString(a) && (a = a.trim()) && !Hr(a))
      o(Dr(a), n);
    else if (d.isObject(a) && d.isIterable(a)) {
      let c = {}, p, l;
      for (const r of a) {
        if (!d.isArray(r))
          throw TypeError("Object iterator must return a key-value pair");
        c[l = r[0]] = (p = c[l]) ? d.isArray(p) ? [...p, r[1]] : [p, r[1]] : r[1];
      }
      o(c, n);
    } else
      a != null && s(n, a, i);
    return this;
  }
  get(a, n) {
    if (a = Ce(a), a) {
      const i = d.findKey(this, a);
      if (i) {
        const t = this[i];
        if (!n)
          return t;
        if (n === !0)
          return Mr(t);
        if (d.isFunction(n))
          return n.call(this, t, i);
        if (d.isRegExp(n))
          return n.exec(t);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(a, n) {
    if (a = Ce(a), a) {
      const i = d.findKey(this, a);
      return !!(i && this[i] !== void 0 && (!n || Ba(this, this[i], i, n)));
    }
    return !1;
  }
  delete(a, n) {
    const i = this;
    let t = !1;
    function s(o) {
      if (o = Ce(o), o) {
        const c = d.findKey(i, o);
        c && (!n || Ba(i, i[c], c, n)) && (delete i[c], t = !0);
      }
    }
    return d.isArray(a) ? a.forEach(s) : s(a), t;
  }
  clear(a) {
    const n = Object.keys(this);
    let i = n.length, t = !1;
    for (; i--; ) {
      const s = n[i];
      (!a || Ba(this, this[s], s, a, !0)) && (delete this[s], t = !0);
    }
    return t;
  }
  normalize(a) {
    const n = this, i = {};
    return d.forEach(this, (t, s) => {
      const o = d.findKey(i, s);
      if (o) {
        n[o] = Ye(t), delete n[s];
        return;
      }
      const c = a ? Gr(s) : String(s).trim();
      c !== s && delete n[s], n[c] = Ye(t), i[c] = !0;
    }), this;
  }
  concat(...a) {
    return this.constructor.concat(this, ...a);
  }
  toJSON(a) {
    const n = /* @__PURE__ */ Object.create(null);
    return d.forEach(this, (i, t) => {
      i != null && i !== !1 && (n[t] = a && d.isArray(i) ? i.join(", ") : i);
    }), n;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([a, n]) => a + ": " + n).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(a) {
    return a instanceof this ? a : new this(a);
  }
  static concat(a, ...n) {
    const i = new this(a);
    return n.forEach((t) => i.set(t)), i;
  }
  static accessor(a) {
    const i = (this[ei] = this[ei] = {
      accessors: {}
    }).accessors, t = this.prototype;
    function s(o) {
      const c = Ce(o);
      i[c] || (Wr(t, o), i[c] = !0);
    }
    return d.isArray(a) ? a.forEach(s) : s(a), this;
  }
};
L.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
d.reduceDescriptors(L.prototype, ({ value: e }, a) => {
  let n = a[0].toUpperCase() + a.slice(1);
  return {
    get: () => e,
    set(i) {
      this[n] = i;
    }
  };
});
d.freezeMethods(L);
function za(e, a) {
  const n = this || Ne, i = a || n, t = L.from(i.headers);
  let s = i.data;
  return d.forEach(e, function(c) {
    s = c.call(n, s, t.normalize(), a ? a.status : void 0);
  }), t.normalize(), s;
}
function ot(e) {
  return !!(e && e.__CANCEL__);
}
function se(e, a, n) {
  b.call(this, e ?? "canceled", b.ERR_CANCELED, a, n), this.name = "CanceledError";
}
d.inherits(se, b, {
  __CANCEL__: !0
});
function be(e, a, n) {
  const i = n.config.validateStatus;
  !n.status || !i || i(n.status) ? e(n) : a(new b(
    "Request failed with status code " + n.status,
    [b.ERR_BAD_REQUEST, b.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4],
    n.config,
    n.request,
    n
  ));
}
function Vr(e) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
function Jr(e, a) {
  return a ? e.replace(/\/?\/$/, "") + "/" + a.replace(/^\/+/, "") : e;
}
function xn(e, a, n) {
  let i = !Vr(a);
  return e && (i || n == !1) ? Jr(e, a) : a;
}
var rt = {}, Kr = oa.parse, Xr = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
}, Yr = String.prototype.endsWith || function(e) {
  return e.length <= this.length && this.indexOf(e, this.length - e.length) !== -1;
};
function Qr(e) {
  var a = typeof e == "string" ? Kr(e) : e || {}, n = a.protocol, i = a.host, t = a.port;
  if (typeof i != "string" || !i || typeof n != "string" || (n = n.split(":", 1)[0], i = i.replace(/:\d*$/, ""), t = parseInt(t) || Xr[n] || 0, !Zr(i, t)))
    return "";
  var s = ge("npm_config_" + n + "_proxy") || ge(n + "_proxy") || ge("npm_config_proxy") || ge("all_proxy");
  return s && s.indexOf("://") === -1 && (s = n + "://" + s), s;
}
function Zr(e, a) {
  var n = (ge("npm_config_no_proxy") || ge("no_proxy")).toLowerCase();
  return n ? n === "*" ? !1 : n.split(/[,\s]/).every(function(i) {
    if (!i)
      return !0;
    var t = i.match(/^(.+):(\d+)$/), s = t ? t[1] : i, o = t ? parseInt(t[2]) : 0;
    return o && o !== a ? !0 : /^[.*]/.test(s) ? (s.charAt(0) === "*" && (s = s.slice(1)), !Yr.call(e, s)) : e !== s;
  }) : !0;
}
function ge(e) {
  return process.env[e.toLowerCase()] || process.env[e.toUpperCase()] || "";
}
rt.getProxyForUrl = Qr;
var vn = { exports: {} }, He = { exports: {} }, Ge = { exports: {} }, Na, ai;
function ec() {
  if (ai) return Na;
  ai = 1;
  var e = 1e3, a = e * 60, n = a * 60, i = n * 24, t = i * 7, s = i * 365.25;
  Na = function(r, u) {
    u = u || {};
    var m = typeof r;
    if (m === "string" && r.length > 0)
      return o(r);
    if (m === "number" && isFinite(r))
      return u.long ? p(r) : c(r);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(r)
    );
  };
  function o(r) {
    if (r = String(r), !(r.length > 100)) {
      var u = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        r
      );
      if (u) {
        var m = parseFloat(u[1]), x = (u[2] || "ms").toLowerCase();
        switch (x) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return m * s;
          case "weeks":
          case "week":
          case "w":
            return m * t;
          case "days":
          case "day":
          case "d":
            return m * i;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return m * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return m * a;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return m * e;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return m;
          default:
            return;
        }
      }
    }
  }
  function c(r) {
    var u = Math.abs(r);
    return u >= i ? Math.round(r / i) + "d" : u >= n ? Math.round(r / n) + "h" : u >= a ? Math.round(r / a) + "m" : u >= e ? Math.round(r / e) + "s" : r + "ms";
  }
  function p(r) {
    var u = Math.abs(r);
    return u >= i ? l(r, u, i, "day") : u >= n ? l(r, u, n, "hour") : u >= a ? l(r, u, a, "minute") : u >= e ? l(r, u, e, "second") : r + " ms";
  }
  function l(r, u, m, x) {
    var f = u >= m * 1.5;
    return Math.round(r / m) + " " + x + (f ? "s" : "");
  }
  return Na;
}
var $a, ni;
function ct() {
  if (ni) return $a;
  ni = 1;
  function e(a) {
    i.debug = i, i.default = i, i.coerce = l, i.disable = c, i.enable = s, i.enabled = p, i.humanize = ec(), i.destroy = r, Object.keys(a).forEach((u) => {
      i[u] = a[u];
    }), i.names = [], i.skips = [], i.formatters = {};
    function n(u) {
      let m = 0;
      for (let x = 0; x < u.length; x++)
        m = (m << 5) - m + u.charCodeAt(x), m |= 0;
      return i.colors[Math.abs(m) % i.colors.length];
    }
    i.selectColor = n;
    function i(u) {
      let m, x = null, f, v;
      function h(...g) {
        if (!h.enabled)
          return;
        const w = h, y = Number(/* @__PURE__ */ new Date()), T = y - (m || y);
        w.diff = T, w.prev = m, w.curr = y, m = y, g[0] = i.coerce(g[0]), typeof g[0] != "string" && g.unshift("%O");
        let R = 0;
        g[0] = g[0].replace(/%([a-zA-Z%])/g, (z, V) => {
          if (z === "%%")
            return "%";
          R++;
          const X = i.formatters[V];
          if (typeof X == "function") {
            const xe = g[R];
            z = X.call(w, xe), g.splice(R, 1), R--;
          }
          return z;
        }), i.formatArgs.call(w, g), (w.log || i.log).apply(w, g);
      }
      return h.namespace = u, h.useColors = i.useColors(), h.color = i.selectColor(u), h.extend = t, h.destroy = i.destroy, Object.defineProperty(h, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => x !== null ? x : (f !== i.namespaces && (f = i.namespaces, v = i.enabled(u)), v),
        set: (g) => {
          x = g;
        }
      }), typeof i.init == "function" && i.init(h), h;
    }
    function t(u, m) {
      const x = i(this.namespace + (typeof m > "u" ? ":" : m) + u);
      return x.log = this.log, x;
    }
    function s(u) {
      i.save(u), i.namespaces = u, i.names = [], i.skips = [];
      const m = (typeof u == "string" ? u : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const x of m)
        x[0] === "-" ? i.skips.push(x.slice(1)) : i.names.push(x);
    }
    function o(u, m) {
      let x = 0, f = 0, v = -1, h = 0;
      for (; x < u.length; )
        if (f < m.length && (m[f] === u[x] || m[f] === "*"))
          m[f] === "*" ? (v = f, h = x, f++) : (x++, f++);
        else if (v !== -1)
          f = v + 1, h++, x = h;
        else
          return !1;
      for (; f < m.length && m[f] === "*"; )
        f++;
      return f === m.length;
    }
    function c() {
      const u = [
        ...i.names,
        ...i.skips.map((m) => "-" + m)
      ].join(",");
      return i.enable(""), u;
    }
    function p(u) {
      for (const m of i.skips)
        if (o(u, m))
          return !1;
      for (const m of i.names)
        if (o(u, m))
          return !0;
      return !1;
    }
    function l(u) {
      return u instanceof Error ? u.stack || u.message : u;
    }
    function r() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return i.enable(i.load()), i;
  }
  return $a = e, $a;
}
var ii;
function ac() {
  return ii || (ii = 1, function(e, a) {
    a.formatArgs = i, a.save = t, a.load = s, a.useColors = n, a.storage = o(), a.destroy = /* @__PURE__ */ (() => {
      let p = !1;
      return () => {
        p || (p = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), a.colors = [
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
    function i(p) {
      if (p[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + p[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors)
        return;
      const l = "color: " + this.color;
      p.splice(1, 0, l, "color: inherit");
      let r = 0, u = 0;
      p[0].replace(/%[a-zA-Z%]/g, (m) => {
        m !== "%%" && (r++, m === "%c" && (u = r));
      }), p.splice(u, 0, l);
    }
    a.log = console.debug || console.log || (() => {
    });
    function t(p) {
      try {
        p ? a.storage.setItem("debug", p) : a.storage.removeItem("debug");
      } catch {
      }
    }
    function s() {
      let p;
      try {
        p = a.storage.getItem("debug") || a.storage.getItem("DEBUG");
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
    e.exports = ct()(a);
    const { formatters: c } = e.exports;
    c.j = function(p) {
      try {
        return JSON.stringify(p);
      } catch (l) {
        return "[UnexpectedJSONParseError]: " + l.message;
      }
    };
  }(Ge, Ge.exports)), Ge.exports;
}
var We = { exports: {} }, Ia, ti;
function nc() {
  return ti || (ti = 1, Ia = (e, a = process.argv) => {
    const n = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", i = a.indexOf(n + e), t = a.indexOf("--");
    return i !== -1 && (t === -1 || i < t);
  }), Ia;
}
var Da, si;
function ic() {
  if (si) return Da;
  si = 1;
  const e = Bt, a = Si, n = nc(), { env: i } = process;
  let t;
  n("no-color") || n("no-colors") || n("color=false") || n("color=never") ? t = 0 : (n("color") || n("colors") || n("color=true") || n("color=always")) && (t = 1), "FORCE_COLOR" in i && (i.FORCE_COLOR === "true" ? t = 1 : i.FORCE_COLOR === "false" ? t = 0 : t = i.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(i.FORCE_COLOR, 10), 3));
  function s(p) {
    return p === 0 ? !1 : {
      level: p,
      hasBasic: !0,
      has256: p >= 2,
      has16m: p >= 3
    };
  }
  function o(p, l) {
    if (t === 0)
      return 0;
    if (n("color=16m") || n("color=full") || n("color=truecolor"))
      return 3;
    if (n("color=256"))
      return 2;
    if (p && !l && t === void 0)
      return 0;
    const r = t || 0;
    if (i.TERM === "dumb")
      return r;
    if (process.platform === "win32") {
      const u = e.release().split(".");
      return Number(u[0]) >= 10 && Number(u[2]) >= 10586 ? Number(u[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in i)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((u) => u in i) || i.CI_NAME === "codeship" ? 1 : r;
    if ("TEAMCITY_VERSION" in i)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(i.TEAMCITY_VERSION) ? 1 : 0;
    if (i.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in i) {
      const u = parseInt((i.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (i.TERM_PROGRAM) {
        case "iTerm.app":
          return u >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(i.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(i.TERM) || "COLORTERM" in i ? 1 : r;
  }
  function c(p) {
    const l = o(p, p && p.isTTY);
    return s(l);
  }
  return Da = {
    supportsColor: c,
    stdout: s(o(!0, a.isatty(1))),
    stderr: s(o(!0, a.isatty(2)))
  }, Da;
}
var oi;
function tc() {
  return oi || (oi = 1, function(e, a) {
    const n = Si, i = Se;
    a.init = r, a.log = c, a.formatArgs = s, a.save = p, a.load = l, a.useColors = t, a.destroy = i.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), a.colors = [6, 2, 3, 4, 5, 1];
    try {
      const m = ic();
      m && (m.stderr || m).level >= 2 && (a.colors = [
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
    a.inspectOpts = Object.keys(process.env).filter((m) => /^debug_/i.test(m)).reduce((m, x) => {
      const f = x.substring(6).toLowerCase().replace(/_([a-z])/g, (h, g) => g.toUpperCase());
      let v = process.env[x];
      return /^(yes|on|true|enabled)$/i.test(v) ? v = !0 : /^(no|off|false|disabled)$/i.test(v) ? v = !1 : v === "null" ? v = null : v = Number(v), m[f] = v, m;
    }, {});
    function t() {
      return "colors" in a.inspectOpts ? !!a.inspectOpts.colors : n.isatty(process.stderr.fd);
    }
    function s(m) {
      const { namespace: x, useColors: f } = this;
      if (f) {
        const v = this.color, h = "\x1B[3" + (v < 8 ? v : "8;5;" + v), g = `  ${h};1m${x} \x1B[0m`;
        m[0] = g + m[0].split(`
`).join(`
` + g), m.push(h + "m+" + e.exports.humanize(this.diff) + "\x1B[0m");
      } else
        m[0] = o() + x + " " + m[0];
    }
    function o() {
      return a.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function c(...m) {
      return process.stderr.write(i.formatWithOptions(a.inspectOpts, ...m) + `
`);
    }
    function p(m) {
      m ? process.env.DEBUG = m : delete process.env.DEBUG;
    }
    function l() {
      return process.env.DEBUG;
    }
    function r(m) {
      m.inspectOpts = {};
      const x = Object.keys(a.inspectOpts);
      for (let f = 0; f < x.length; f++)
        m.inspectOpts[x[f]] = a.inspectOpts[x[f]];
    }
    e.exports = ct()(a);
    const { formatters: u } = e.exports;
    u.o = function(m) {
      return this.inspectOpts.colors = this.useColors, i.inspect(m, this.inspectOpts).split(`
`).map((x) => x.trim()).join(" ");
    }, u.O = function(m) {
      return this.inspectOpts.colors = this.useColors, i.inspect(m, this.inspectOpts);
    };
  }(We, We.exports)), We.exports;
}
var ri;
function sc() {
  return ri || (ri = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? He.exports = ac() : He.exports = tc()), He.exports;
}
var Ae, oc = function() {
  if (!Ae) {
    try {
      Ae = sc()("follow-redirects");
    } catch {
    }
    typeof Ae != "function" && (Ae = function() {
    });
  }
  Ae.apply(null, arguments);
}, $e = oa, Fe = $e.URL, rc = sn, cc = on, hn = G.Writable, bn = Lt, pt = oc;
(function() {
  var a = typeof process < "u", n = typeof window < "u" && typeof document < "u", i = me(Error.captureStackTrace);
  !a && (n || !i) && console.warn("The follow-redirects package should be excluded from browser builds.");
})();
var gn = !1;
try {
  bn(new Fe(""));
} catch (e) {
  gn = e.code === "ERR_INVALID_URL";
}
var pc = [
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
], yn = ["abort", "aborted", "connect", "error", "socket", "timeout"], wn = /* @__PURE__ */ Object.create(null);
yn.forEach(function(e) {
  wn[e] = function(a, n, i) {
    this._redirectable.emit(e, a, n, i);
  };
});
var Ya = Ie(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
), Qa = Ie(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
), lc = Ie(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  Qa
), uc = Ie(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
), dc = Ie(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
), mc = hn.prototype.destroy || ut;
function D(e, a) {
  hn.call(this), this._sanitizeOptions(e), this._options = e, this._ended = !1, this._ending = !1, this._redirectCount = 0, this._redirects = [], this._requestBodyLength = 0, this._requestBodyBuffers = [], a && this.on("response", a);
  var n = this;
  this._onNativeResponse = function(i) {
    try {
      n._processResponse(i);
    } catch (t) {
      n.emit("error", t instanceof Qa ? t : new Qa({ cause: t }));
    }
  }, this._performRequest();
}
D.prototype = Object.create(hn.prototype);
D.prototype.abort = function() {
  _n(this._currentRequest), this._currentRequest.abort(), this.emit("abort");
};
D.prototype.destroy = function(e) {
  return _n(this._currentRequest, e), mc.call(this, e), this;
};
D.prototype.write = function(e, a, n) {
  if (this._ending)
    throw new dc();
  if (!ue(e) && !vc(e))
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  if (me(a) && (n = a, a = null), e.length === 0) {
    n && n();
    return;
  }
  this._requestBodyLength + e.length <= this._options.maxBodyLength ? (this._requestBodyLength += e.length, this._requestBodyBuffers.push({ data: e, encoding: a }), this._currentRequest.write(e, a, n)) : (this.emit("error", new uc()), this.abort());
};
D.prototype.end = function(e, a, n) {
  if (me(e) ? (n = e, e = a = null) : me(a) && (n = a, a = null), !e)
    this._ended = this._ending = !0, this._currentRequest.end(null, null, n);
  else {
    var i = this, t = this._currentRequest;
    this.write(e, a, function() {
      i._ended = !0, t.end(null, null, n);
    }), this._ending = !0;
  }
};
D.prototype.setHeader = function(e, a) {
  this._options.headers[e] = a, this._currentRequest.setHeader(e, a);
};
D.prototype.removeHeader = function(e) {
  delete this._options.headers[e], this._currentRequest.removeHeader(e);
};
D.prototype.setTimeout = function(e, a) {
  var n = this;
  function i(o) {
    o.setTimeout(e), o.removeListener("timeout", o.destroy), o.addListener("timeout", o.destroy);
  }
  function t(o) {
    n._timeout && clearTimeout(n._timeout), n._timeout = setTimeout(function() {
      n.emit("timeout"), s();
    }, e), i(o);
  }
  function s() {
    n._timeout && (clearTimeout(n._timeout), n._timeout = null), n.removeListener("abort", s), n.removeListener("error", s), n.removeListener("response", s), n.removeListener("close", s), a && n.removeListener("timeout", a), n.socket || n._currentRequest.removeListener("socket", t);
  }
  return a && this.on("timeout", a), this.socket ? t(this.socket) : this._currentRequest.once("socket", t), this.on("socket", i), this.on("abort", s), this.on("error", s), this.on("response", s), this.on("close", s), this;
};
[
  "flushHeaders",
  "getHeader",
  "setNoDelay",
  "setSocketKeepAlive"
].forEach(function(e) {
  D.prototype[e] = function(a, n) {
    return this._currentRequest[e](a, n);
  };
});
["aborted", "connection", "socket"].forEach(function(e) {
  Object.defineProperty(D.prototype, e, {
    get: function() {
      return this._currentRequest[e];
    }
  });
});
D.prototype._sanitizeOptions = function(e) {
  if (e.headers || (e.headers = {}), e.host && (e.hostname || (e.hostname = e.host), delete e.host), !e.pathname && e.path) {
    var a = e.path.indexOf("?");
    a < 0 ? e.pathname = e.path : (e.pathname = e.path.substring(0, a), e.search = e.path.substring(a));
  }
};
D.prototype._performRequest = function() {
  var e = this._options.protocol, a = this._options.nativeProtocols[e];
  if (!a)
    throw new TypeError("Unsupported protocol " + e);
  if (this._options.agents) {
    var n = e.slice(0, -1);
    this._options.agent = this._options.agents[n];
  }
  var i = this._currentRequest = a.request(this._options, this._onNativeResponse);
  i._redirectable = this;
  for (var t of yn)
    i.on(t, wn[t]);
  if (this._currentUrl = /^\//.test(this._options.path) ? $e.format(this._options) : (
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path
  ), this._isRedirect) {
    var s = 0, o = this, c = this._requestBodyBuffers;
    (function p(l) {
      if (i === o._currentRequest)
        if (l)
          o.emit("error", l);
        else if (s < c.length) {
          var r = c[s++];
          i.finished || i.write(r.data, r.encoding, p);
        } else o._ended && i.end();
    })();
  }
};
D.prototype._processResponse = function(e) {
  var a = e.statusCode;
  this._options.trackRedirects && this._redirects.push({
    url: this._currentUrl,
    headers: e.headers,
    statusCode: a
  });
  var n = e.headers.location;
  if (!n || this._options.followRedirects === !1 || a < 300 || a >= 400) {
    e.responseUrl = this._currentUrl, e.redirects = this._redirects, this.emit("response", e), this._requestBodyBuffers = [];
    return;
  }
  if (_n(this._currentRequest), e.destroy(), ++this._redirectCount > this._options.maxRedirects)
    throw new lc();
  var i, t = this._options.beforeRedirect;
  t && (i = Object.assign({
    // The Host header was set by nativeProtocol.request
    Host: e.req.getHeader("host")
  }, this._options.headers));
  var s = this._options.method;
  ((a === 301 || a === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
  // the server is redirecting the user agent to a different resource […]
  // A user agent can perform a retrieval request targeting that URI
  // (a GET or HEAD request if using HTTP) […]
  a === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) && (this._options.method = "GET", this._requestBodyBuffers = [], Ma(/^content-/i, this._options.headers));
  var o = Ma(/^host$/i, this._options.headers), c = kn(this._currentUrl), p = o || c.host, l = /^\w+:/.test(n) ? this._currentUrl : $e.format(Object.assign(c, { host: p })), r = fc(n, l);
  if (pt("redirecting to", r.href), this._isRedirect = !0, Za(r, this._options), (r.protocol !== c.protocol && r.protocol !== "https:" || r.host !== p && !xc(r.host, p)) && Ma(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers), me(t)) {
    var u = {
      headers: e.headers,
      statusCode: a
    }, m = {
      url: l,
      method: s,
      headers: i
    };
    t(this._options, u, m), this._sanitizeOptions(this._options);
  }
  this._performRequest();
};
function lt(e) {
  var a = {
    maxRedirects: 21,
    maxBodyLength: 10485760
  }, n = {};
  return Object.keys(e).forEach(function(i) {
    var t = i + ":", s = n[t] = e[i], o = a[i] = Object.create(s);
    function c(l, r, u) {
      return hc(l) ? l = Za(l) : ue(l) ? l = Za(kn(l)) : (u = r, r = dt(l), l = { protocol: t }), me(r) && (u = r, r = null), r = Object.assign({
        maxRedirects: a.maxRedirects,
        maxBodyLength: a.maxBodyLength
      }, l, r), r.nativeProtocols = n, !ue(r.host) && !ue(r.hostname) && (r.hostname = "::1"), bn.equal(r.protocol, t, "protocol mismatch"), pt("options", r), new D(r, u);
    }
    function p(l, r, u) {
      var m = o.request(l, r, u);
      return m.end(), m;
    }
    Object.defineProperties(o, {
      request: { value: c, configurable: !0, enumerable: !0, writable: !0 },
      get: { value: p, configurable: !0, enumerable: !0, writable: !0 }
    });
  }), a;
}
function ut() {
}
function kn(e) {
  var a;
  if (gn)
    a = new Fe(e);
  else if (a = dt($e.parse(e)), !ue(a.protocol))
    throw new Ya({ input: e });
  return a;
}
function fc(e, a) {
  return gn ? new Fe(e, a) : kn($e.resolve(a, e));
}
function dt(e) {
  if (/^\[/.test(e.hostname) && !/^\[[:0-9a-f]+\]$/i.test(e.hostname))
    throw new Ya({ input: e.href || e });
  if (/^\[/.test(e.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(e.host))
    throw new Ya({ input: e.href || e });
  return e;
}
function Za(e, a) {
  var n = a || {};
  for (var i of pc)
    n[i] = e[i];
  return n.hostname.startsWith("[") && (n.hostname = n.hostname.slice(1, -1)), n.port !== "" && (n.port = Number(n.port)), n.path = n.search ? n.pathname + n.search : n.pathname, n;
}
function Ma(e, a) {
  var n;
  for (var i in a)
    e.test(i) && (n = a[i], delete a[i]);
  return n === null || typeof n > "u" ? void 0 : String(n).trim();
}
function Ie(e, a, n) {
  function i(t) {
    me(Error.captureStackTrace) && Error.captureStackTrace(this, this.constructor), Object.assign(this, t || {}), this.code = e, this.message = this.cause ? a + ": " + this.cause.message : a;
  }
  return i.prototype = new (n || Error)(), Object.defineProperties(i.prototype, {
    constructor: {
      value: i,
      enumerable: !1
    },
    name: {
      value: "Error [" + e + "]",
      enumerable: !1
    }
  }), i;
}
function _n(e, a) {
  for (var n of yn)
    e.removeListener(n, wn[n]);
  e.on("error", ut), e.destroy(a);
}
function xc(e, a) {
  bn(ue(e) && ue(a));
  var n = e.length - a.length - 1;
  return n > 0 && e[n] === "." && e.endsWith(a);
}
function ue(e) {
  return typeof e == "string" || e instanceof String;
}
function me(e) {
  return typeof e == "function";
}
function vc(e) {
  return typeof e == "object" && "length" in e;
}
function hc(e) {
  return Fe && e instanceof Fe;
}
vn.exports = lt({ http: rc, https: cc });
vn.exports.wrap = lt;
var bc = vn.exports;
const gc = /* @__PURE__ */ Ui(bc), aa = "1.11.0";
function mt(e) {
  const a = /^([-+\w]{1,25})(:?\/\/|:)/.exec(e);
  return a && a[1] || "";
}
const yc = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function wc(e, a, n) {
  const i = n && n.Blob || O.classes.Blob, t = mt(e);
  if (a === void 0 && i && (a = !0), t === "data") {
    e = t.length ? e.slice(t.length + 1) : e;
    const s = yc.exec(e);
    if (!s)
      throw new b("Invalid URL", b.ERR_INVALID_URL);
    const o = s[1], c = s[2], p = s[3], l = Buffer.from(decodeURIComponent(p), c ? "base64" : "utf8");
    if (a) {
      if (!i)
        throw new b("Blob is not supported", b.ERR_NOT_SUPPORT);
      return new i([l], { type: o });
    }
    return l;
  }
  throw new b("Unsupported protocol " + t, b.ERR_NOT_SUPPORT);
}
const Ha = Symbol("internals");
class ci extends G.Transform {
  constructor(a) {
    a = d.toFlatObject(a, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (i, t) => !d.isUndefined(t[i])), super({
      readableHighWaterMark: a.chunkSize
    });
    const n = this[Ha] = {
      timeWindow: a.timeWindow,
      chunkSize: a.chunkSize,
      maxRate: a.maxRate,
      minChunkSize: a.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (i) => {
      i === "progress" && (n.isCaptured || (n.isCaptured = !0));
    });
  }
  _read(a) {
    const n = this[Ha];
    return n.onReadCallback && n.onReadCallback(), super._read(a);
  }
  _transform(a, n, i) {
    const t = this[Ha], s = t.maxRate, o = this.readableHighWaterMark, c = t.timeWindow, p = 1e3 / c, l = s / p, r = t.minChunkSize !== !1 ? Math.max(t.minChunkSize, l * 0.01) : 0, u = (x, f) => {
      const v = Buffer.byteLength(x);
      t.bytesSeen += v, t.bytes += v, t.isCaptured && this.emit("progress", t.bytesSeen), this.push(x) ? process.nextTick(f) : t.onReadCallback = () => {
        t.onReadCallback = null, process.nextTick(f);
      };
    }, m = (x, f) => {
      const v = Buffer.byteLength(x);
      let h = null, g = o, w, y = 0;
      if (s) {
        const T = Date.now();
        (!t.ts || (y = T - t.ts) >= c) && (t.ts = T, w = l - t.bytes, t.bytes = w < 0 ? -w : 0, y = 0), w = l - t.bytes;
      }
      if (s) {
        if (w <= 0)
          return setTimeout(() => {
            f(null, x);
          }, c - y);
        w < g && (g = w);
      }
      g && v > g && v - g > r && (h = x.subarray(g), x = x.subarray(0, g)), u(x, h ? () => {
        process.nextTick(f, null, h);
      } : f);
    };
    m(a, function x(f, v) {
      if (f)
        return i(f);
      v ? m(v, x) : i(null);
    });
  }
}
const { asyncIterator: pi } = Symbol, ft = async function* (e) {
  e.stream ? yield* e.stream() : e.arrayBuffer ? yield await e.arrayBuffer() : e[pi] ? yield* e[pi]() : yield e;
}, kc = O.ALPHABET.ALPHA_DIGIT + "-_", Pe = typeof TextEncoder == "function" ? new TextEncoder() : new Se.TextEncoder(), pe = `\r
`, _c = Pe.encode(pe), Sc = 2;
class Ec {
  constructor(a, n) {
    const { escapeName: i } = this.constructor, t = d.isString(n);
    let s = `Content-Disposition: form-data; name="${i(a)}"${!t && n.name ? `; filename="${i(n.name)}"` : ""}${pe}`;
    t ? n = Pe.encode(String(n).replace(/\r?\n|\r\n?/g, pe)) : s += `Content-Type: ${n.type || "application/octet-stream"}${pe}`, this.headers = Pe.encode(s + pe), this.contentLength = t ? n.byteLength : n.size, this.size = this.headers.byteLength + this.contentLength + Sc, this.name = a, this.value = n;
  }
  async *encode() {
    yield this.headers;
    const { value: a } = this;
    d.isTypedArray(a) ? yield a : yield* ft(a), yield _c;
  }
  static escapeName(a) {
    return String(a).replace(/[\r\n"]/g, (n) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[n]);
  }
}
const Rc = (e, a, n) => {
  const {
    tag: i = "form-data-boundary",
    size: t = 25,
    boundary: s = i + "-" + O.generateString(t, kc)
  } = n || {};
  if (!d.isFormData(e))
    throw TypeError("FormData instance required");
  if (s.length < 1 || s.length > 70)
    throw Error("boundary must be 10-70 characters long");
  const o = Pe.encode("--" + s + pe), c = Pe.encode("--" + s + "--" + pe);
  let p = c.byteLength;
  const l = Array.from(e.entries()).map(([u, m]) => {
    const x = new Ec(u, m);
    return p += x.size, x;
  });
  p += o.byteLength * l.length, p = d.toFiniteNumber(p);
  const r = {
    "Content-Type": `multipart/form-data; boundary=${s}`
  };
  return Number.isFinite(p) && (r["Content-Length"] = p), a && a(r), qt.from(async function* () {
    for (const u of l)
      yield o, yield* u.encode();
    yield c;
  }());
};
class Cc extends G.Transform {
  __transform(a, n, i) {
    this.push(a), i();
  }
  _transform(a, n, i) {
    if (a.length !== 0 && (this._transform = this.__transform, a[0] !== 120)) {
      const t = Buffer.alloc(2);
      t[0] = 120, t[1] = 156, this.push(t, n);
    }
    this.__transform(a, n, i);
  }
}
const Ac = (e, a) => d.isAsyncFn(e) ? function(...n) {
  const i = n.pop();
  e.apply(this, n).then((t) => {
    try {
      a ? i(null, ...a(t)) : i(null, t);
    } catch (s) {
      i(s);
    }
  }, i);
} : e;
function jc(e, a) {
  e = e || 10;
  const n = new Array(e), i = new Array(e);
  let t = 0, s = 0, o;
  return a = a !== void 0 ? a : 1e3, function(p) {
    const l = Date.now(), r = i[s];
    o || (o = l), n[t] = p, i[t] = l;
    let u = s, m = 0;
    for (; u !== t; )
      m += n[u++], u = u % e;
    if (t = (t + 1) % e, t === s && (s = (s + 1) % e), l - o < a)
      return;
    const x = r && l - r;
    return x ? Math.round(m * 1e3 / x) : void 0;
  };
}
function Tc(e, a) {
  let n = 0, i = 1e3 / a, t, s;
  const o = (l, r = Date.now()) => {
    n = r, t = null, s && (clearTimeout(s), s = null), e(...l);
  };
  return [(...l) => {
    const r = Date.now(), u = r - n;
    u >= i ? o(l, r) : (t = l, s || (s = setTimeout(() => {
      s = null, o(t);
    }, i - u)));
  }, () => t && o(t)];
}
const _e = (e, a, n = 3) => {
  let i = 0;
  const t = jc(50, 250);
  return Tc((s) => {
    const o = s.loaded, c = s.lengthComputable ? s.total : void 0, p = o - i, l = t(p), r = o <= c;
    i = o;
    const u = {
      loaded: o,
      total: c,
      progress: c ? o / c : void 0,
      bytes: p,
      rate: l || void 0,
      estimated: l && c && r ? (c - o) / l : void 0,
      event: s,
      lengthComputable: c != null,
      [a ? "download" : "upload"]: !0
    };
    e(u);
  }, n);
}, na = (e, a) => {
  const n = e != null;
  return [(i) => a[0]({
    lengthComputable: n,
    total: e,
    loaded: i
  }), a[1]];
}, ia = (e) => (...a) => d.asap(() => e(...a)), li = {
  flush: ae.constants.Z_SYNC_FLUSH,
  finishFlush: ae.constants.Z_SYNC_FLUSH
}, Oc = {
  flush: ae.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: ae.constants.BROTLI_OPERATION_FLUSH
}, ui = d.isFunction(ae.createBrotliDecompress), { http: Fc, https: Pc } = gc, qc = /https:?/, di = O.protocols.map((e) => e + ":"), mi = (e, [a, n]) => (e.on("end", n).on("error", n), a);
function Uc(e, a) {
  e.beforeRedirects.proxy && e.beforeRedirects.proxy(e), e.beforeRedirects.config && e.beforeRedirects.config(e, a);
}
function xt(e, a, n) {
  let i = a;
  if (!i && i !== !1) {
    const t = rt.getProxyForUrl(n);
    t && (i = new URL(t));
  }
  if (i) {
    if (i.username && (i.auth = (i.username || "") + ":" + (i.password || "")), i.auth) {
      (i.auth.username || i.auth.password) && (i.auth = (i.auth.username || "") + ":" + (i.auth.password || ""));
      const s = Buffer.from(i.auth, "utf8").toString("base64");
      e.headers["Proxy-Authorization"] = "Basic " + s;
    }
    e.headers.host = e.hostname + (e.port ? ":" + e.port : "");
    const t = i.hostname || i.host;
    e.hostname = t, e.host = t, e.port = i.port, e.path = n, i.protocol && (e.protocol = i.protocol.includes(":") ? i.protocol : `${i.protocol}:`);
  }
  e.beforeRedirects.proxy = function(s) {
    xt(s, a, s.href);
  };
}
const Lc = typeof process < "u" && d.kindOf(process) === "process", Bc = (e) => new Promise((a, n) => {
  let i, t;
  const s = (p, l) => {
    t || (t = !0, i && i(p, l));
  }, o = (p) => {
    s(p), a(p);
  }, c = (p) => {
    s(p, !0), n(p);
  };
  e(o, c, (p) => i = p).catch(c);
}), zc = ({ address: e, family: a }) => {
  if (!d.isString(e))
    throw TypeError("address must be a string");
  return {
    address: e,
    family: a || (e.indexOf(".") < 0 ? 6 : 4)
  };
}, fi = (e, a) => zc(d.isObject(e) ? e : { address: e, family: a }), Nc = Lc && function(a) {
  return Bc(async function(i, t, s) {
    let { data: o, lookup: c, family: p } = a;
    const { responseType: l, responseEncoding: r } = a, u = a.method.toUpperCase();
    let m, x = !1, f;
    if (c) {
      const _ = Ac(c, (k) => d.isArray(k) ? k : [k]);
      c = (k, B, oe) => {
        _(k, B, (U, Z, ba) => {
          if (U)
            return oe(U);
          const Y = d.isArray(Z) ? Z.map((H) => fi(H)) : [fi(Z, ba)];
          B.all ? oe(U, Y) : oe(U, Y[0].address, Y[0].family);
        });
      };
    }
    const v = new zt(), h = () => {
      a.cancelToken && a.cancelToken.unsubscribe(g), a.signal && a.signal.removeEventListener("abort", g), v.removeAllListeners();
    };
    s((_, k) => {
      m = !0, k && (x = !0, h());
    });
    function g(_) {
      v.emit("abort", !_ || _.type ? new se(null, a, f) : _);
    }
    v.once("abort", t), (a.cancelToken || a.signal) && (a.cancelToken && a.cancelToken.subscribe(g), a.signal && (a.signal.aborted ? g() : a.signal.addEventListener("abort", g)));
    const w = xn(a.baseURL, a.url, a.allowAbsoluteUrls), y = new URL(w, O.hasBrowserEnv ? O.origin : void 0), T = y.protocol || di[0];
    if (T === "data:") {
      let _;
      if (u !== "GET")
        return be(i, t, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config: a
        });
      try {
        _ = wc(a.url, l === "blob", {
          Blob: a.env && a.env.Blob
        });
      } catch (k) {
        throw b.from(k, b.ERR_BAD_REQUEST, a);
      }
      return l === "text" ? (_ = _.toString(r), (!r || r === "utf8") && (_ = d.stripBOM(_))) : l === "stream" && (_ = G.Readable.from(_)), be(i, t, {
        data: _,
        status: 200,
        statusText: "OK",
        headers: new L(),
        config: a
      });
    }
    if (di.indexOf(T) === -1)
      return t(new b(
        "Unsupported protocol " + T,
        b.ERR_BAD_REQUEST,
        a
      ));
    const R = L.from(a.headers).normalize();
    R.set("User-Agent", "axios/" + aa, !1);
    const { onUploadProgress: M, onDownloadProgress: z } = a, V = a.maxRate;
    let X, xe;
    if (d.isSpecCompliantForm(o)) {
      const _ = R.getContentType(/boundary=([-_\w\d]{10,70})/i);
      o = Rc(o, (k) => {
        R.set(k);
      }, {
        tag: `axios-${aa}-boundary`,
        boundary: _ && _[1] || void 0
      });
    } else if (d.isFormData(o) && d.isFunction(o.getHeaders)) {
      if (R.set(o.getHeaders()), !R.hasContentLength())
        try {
          const _ = await Se.promisify(o.getLength).call(o);
          Number.isFinite(_) && _ >= 0 && R.setContentLength(_);
        } catch {
        }
    } else if (d.isBlob(o) || d.isFile(o))
      o.size && R.setContentType(o.type || "application/octet-stream"), R.setContentLength(o.size || 0), o = G.Readable.from(ft(o));
    else if (o && !d.isStream(o)) {
      if (!Buffer.isBuffer(o)) if (d.isArrayBuffer(o))
        o = Buffer.from(new Uint8Array(o));
      else if (d.isString(o))
        o = Buffer.from(o, "utf-8");
      else
        return t(new b(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          b.ERR_BAD_REQUEST,
          a
        ));
      if (R.setContentLength(o.length, !1), a.maxBodyLength > -1 && o.length > a.maxBodyLength)
        return t(new b(
          "Request body larger than maxBodyLength limit",
          b.ERR_BAD_REQUEST,
          a
        ));
    }
    const jt = d.toFiniteNumber(R.getContentLength());
    d.isArray(V) ? (X = V[0], xe = V[1]) : X = xe = V, o && (M || X) && (d.isStream(o) || (o = G.Readable.from(o, { objectMode: !1 })), o = G.pipeline([o, new ci({
      maxRate: d.toFiniteNumber(X)
    })], d.noop), M && o.on("progress", mi(
      o,
      na(
        jt,
        _e(ia(M), !1, 3)
      )
    )));
    let Re;
    if (a.auth) {
      const _ = a.auth.username || "", k = a.auth.password || "";
      Re = _ + ":" + k;
    }
    if (!Re && y.username) {
      const _ = y.username, k = y.password;
      Re = _ + ":" + k;
    }
    Re && R.delete("authorization");
    let Cn;
    try {
      Cn = dn(
        y.pathname + y.search,
        a.params,
        a.paramsSerializer
      ).replace(/^\?/, "");
    } catch (_) {
      const k = new Error(_.message);
      return k.config = a, k.url = a.url, k.exists = !0, t(k);
    }
    R.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (ui ? ", br" : ""),
      !1
    );
    const $ = {
      path: Cn,
      method: u,
      headers: R.toJSON(),
      agents: { http: a.httpAgent, https: a.httpsAgent },
      auth: Re,
      protocol: T,
      family: p,
      beforeRedirect: Uc,
      beforeRedirects: {}
    };
    !d.isUndefined(c) && ($.lookup = c), a.socketPath ? $.socketPath = a.socketPath : ($.hostname = y.hostname.startsWith("[") ? y.hostname.slice(1, -1) : y.hostname, $.port = y.port, xt($, a.proxy, T + "//" + y.hostname + (y.port ? ":" + y.port : "") + $.path));
    let De;
    const ha = qc.test($.protocol);
    if ($.agent = ha ? a.httpsAgent : a.httpAgent, a.transport ? De = a.transport : a.maxRedirects === 0 ? De = ha ? on : sn : (a.maxRedirects && ($.maxRedirects = a.maxRedirects), a.beforeRedirect && ($.beforeRedirects.config = a.beforeRedirect), De = ha ? Pc : Fc), a.maxBodyLength > -1 ? $.maxBodyLength = a.maxBodyLength : $.maxBodyLength = 1 / 0, a.insecureHTTPParser && ($.insecureHTTPParser = a.insecureHTTPParser), f = De.request($, function(k) {
      if (f.destroyed) return;
      const B = [k], oe = +k.headers["content-length"];
      if (z || xe) {
        const H = new ci({
          maxRate: d.toFiniteNumber(xe)
        });
        z && H.on("progress", mi(
          H,
          na(
            oe,
            _e(ia(z), !0, 3)
          )
        )), B.push(H);
      }
      let U = k;
      const Z = k.req || f;
      if (a.decompress !== !1 && k.headers["content-encoding"])
        switch ((u === "HEAD" || k.statusCode === 204) && delete k.headers["content-encoding"], (k.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            B.push(ae.createUnzip(li)), delete k.headers["content-encoding"];
            break;
          case "deflate":
            B.push(new Cc()), B.push(ae.createUnzip(li)), delete k.headers["content-encoding"];
            break;
          case "br":
            ui && (B.push(ae.createBrotliDecompress(Oc)), delete k.headers["content-encoding"]);
        }
      U = B.length > 1 ? G.pipeline(B, d.noop) : B[0];
      const ba = G.finished(U, () => {
        ba(), h();
      }), Y = {
        status: k.statusCode,
        statusText: k.statusMessage,
        headers: new L(k.headers),
        config: a,
        request: Z
      };
      if (l === "stream")
        Y.data = U, be(i, t, Y);
      else {
        const H = [];
        let An = 0;
        U.on("data", function(N) {
          H.push(N), An += N.length, a.maxContentLength > -1 && An > a.maxContentLength && (x = !0, U.destroy(), t(new b(
            "maxContentLength size of " + a.maxContentLength + " exceeded",
            b.ERR_BAD_RESPONSE,
            a,
            Z
          )));
        }), U.on("aborted", function() {
          if (x)
            return;
          const N = new b(
            "stream has been aborted",
            b.ERR_BAD_RESPONSE,
            a,
            Z
          );
          U.destroy(N), t(N);
        }), U.on("error", function(N) {
          f.destroyed || t(b.from(N, null, a, Z));
        }), U.on("end", function() {
          try {
            let N = H.length === 1 ? H[0] : Buffer.concat(H);
            l !== "arraybuffer" && (N = N.toString(r), (!r || r === "utf8") && (N = d.stripBOM(N))), Y.data = N;
          } catch (N) {
            return t(b.from(N, null, a, Y.request, Y));
          }
          be(i, t, Y);
        });
      }
      v.once("abort", (H) => {
        U.destroyed || (U.emit("error", H), U.destroy());
      });
    }), v.once("abort", (_) => {
      t(_), f.destroy(_);
    }), f.on("error", function(k) {
      t(b.from(k, null, a, f));
    }), f.on("socket", function(k) {
      k.setKeepAlive(!0, 1e3 * 60);
    }), a.timeout) {
      const _ = parseInt(a.timeout, 10);
      if (Number.isNaN(_)) {
        t(new b(
          "error trying to parse `config.timeout` to int",
          b.ERR_BAD_OPTION_VALUE,
          a,
          f
        ));
        return;
      }
      f.setTimeout(_, function() {
        if (m) return;
        let B = a.timeout ? "timeout of " + a.timeout + "ms exceeded" : "timeout exceeded";
        const oe = a.transitional || mn;
        a.timeoutErrorMessage && (B = a.timeoutErrorMessage), t(new b(
          B,
          oe.clarifyTimeoutError ? b.ETIMEDOUT : b.ECONNABORTED,
          a,
          f
        )), g();
      });
    }
    if (d.isStream(o)) {
      let _ = !1, k = !1;
      o.on("end", () => {
        _ = !0;
      }), o.once("error", (B) => {
        k = !0, f.destroy(B);
      }), o.on("close", () => {
        !_ && !k && g(new se("Request stream has been aborted", a, f));
      }), o.pipe(f);
    } else
      f.end(o);
  });
}, $c = O.hasStandardBrowserEnv ? /* @__PURE__ */ ((e, a) => (n) => (n = new URL(n, O.origin), e.protocol === n.protocol && e.host === n.host && (a || e.port === n.port)))(
  new URL(O.origin),
  O.navigator && /(msie|trident)/i.test(O.navigator.userAgent)
) : () => !0, Ic = O.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(e, a, n, i, t, s) {
      const o = [e + "=" + encodeURIComponent(a)];
      d.isNumber(n) && o.push("expires=" + new Date(n).toGMTString()), d.isString(i) && o.push("path=" + i), d.isString(t) && o.push("domain=" + t), s === !0 && o.push("secure"), document.cookie = o.join("; ");
    },
    read(e) {
      const a = document.cookie.match(new RegExp("(^|;\\s*)(" + e + ")=([^;]*)"));
      return a ? decodeURIComponent(a[3]) : null;
    },
    remove(e) {
      this.write(e, "", Date.now() - 864e5);
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
), xi = (e) => e instanceof L ? { ...e } : e;
function fe(e, a) {
  a = a || {};
  const n = {};
  function i(l, r, u, m) {
    return d.isPlainObject(l) && d.isPlainObject(r) ? d.merge.call({ caseless: m }, l, r) : d.isPlainObject(r) ? d.merge({}, r) : d.isArray(r) ? r.slice() : r;
  }
  function t(l, r, u, m) {
    if (d.isUndefined(r)) {
      if (!d.isUndefined(l))
        return i(void 0, l, u, m);
    } else return i(l, r, u, m);
  }
  function s(l, r) {
    if (!d.isUndefined(r))
      return i(void 0, r);
  }
  function o(l, r) {
    if (d.isUndefined(r)) {
      if (!d.isUndefined(l))
        return i(void 0, l);
    } else return i(void 0, r);
  }
  function c(l, r, u) {
    if (u in a)
      return i(l, r);
    if (u in e)
      return i(void 0, l);
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
    validateStatus: c,
    headers: (l, r, u) => t(xi(l), xi(r), u, !0)
  };
  return d.forEach(Object.keys({ ...e, ...a }), function(r) {
    const u = p[r] || t, m = u(e[r], a[r], r);
    d.isUndefined(m) && u !== c || (n[r] = m);
  }), n;
}
const vt = (e) => {
  const a = fe({}, e);
  let { data: n, withXSRFToken: i, xsrfHeaderName: t, xsrfCookieName: s, headers: o, auth: c } = a;
  a.headers = o = L.from(o), a.url = dn(xn(a.baseURL, a.url, a.allowAbsoluteUrls), e.params, e.paramsSerializer), c && o.set(
    "Authorization",
    "Basic " + btoa((c.username || "") + ":" + (c.password ? unescape(encodeURIComponent(c.password)) : ""))
  );
  let p;
  if (d.isFormData(n)) {
    if (O.hasStandardBrowserEnv || O.hasStandardBrowserWebWorkerEnv)
      o.setContentType(void 0);
    else if ((p = o.getContentType()) !== !1) {
      const [l, ...r] = p ? p.split(";").map((u) => u.trim()).filter(Boolean) : [];
      o.setContentType([l || "multipart/form-data", ...r].join("; "));
    }
  }
  if (O.hasStandardBrowserEnv && (i && d.isFunction(i) && (i = i(a)), i || i !== !1 && $c(a.url))) {
    const l = t && s && Ic.read(s);
    l && o.set(t, l);
  }
  return a;
}, Dc = typeof XMLHttpRequest < "u", Mc = Dc && function(e) {
  return new Promise(function(n, i) {
    const t = vt(e);
    let s = t.data;
    const o = L.from(t.headers).normalize();
    let { responseType: c, onUploadProgress: p, onDownloadProgress: l } = t, r, u, m, x, f;
    function v() {
      x && x(), f && f(), t.cancelToken && t.cancelToken.unsubscribe(r), t.signal && t.signal.removeEventListener("abort", r);
    }
    let h = new XMLHttpRequest();
    h.open(t.method.toUpperCase(), t.url, !0), h.timeout = t.timeout;
    function g() {
      if (!h)
        return;
      const y = L.from(
        "getAllResponseHeaders" in h && h.getAllResponseHeaders()
      ), R = {
        data: !c || c === "text" || c === "json" ? h.responseText : h.response,
        status: h.status,
        statusText: h.statusText,
        headers: y,
        config: e,
        request: h
      };
      be(function(z) {
        n(z), v();
      }, function(z) {
        i(z), v();
      }, R), h = null;
    }
    "onloadend" in h ? h.onloadend = g : h.onreadystatechange = function() {
      !h || h.readyState !== 4 || h.status === 0 && !(h.responseURL && h.responseURL.indexOf("file:") === 0) || setTimeout(g);
    }, h.onabort = function() {
      h && (i(new b("Request aborted", b.ECONNABORTED, e, h)), h = null);
    }, h.onerror = function() {
      i(new b("Network Error", b.ERR_NETWORK, e, h)), h = null;
    }, h.ontimeout = function() {
      let T = t.timeout ? "timeout of " + t.timeout + "ms exceeded" : "timeout exceeded";
      const R = t.transitional || mn;
      t.timeoutErrorMessage && (T = t.timeoutErrorMessage), i(new b(
        T,
        R.clarifyTimeoutError ? b.ETIMEDOUT : b.ECONNABORTED,
        e,
        h
      )), h = null;
    }, s === void 0 && o.setContentType(null), "setRequestHeader" in h && d.forEach(o.toJSON(), function(T, R) {
      h.setRequestHeader(R, T);
    }), d.isUndefined(t.withCredentials) || (h.withCredentials = !!t.withCredentials), c && c !== "json" && (h.responseType = t.responseType), l && ([m, f] = _e(l, !0), h.addEventListener("progress", m)), p && h.upload && ([u, x] = _e(p), h.upload.addEventListener("progress", u), h.upload.addEventListener("loadend", x)), (t.cancelToken || t.signal) && (r = (y) => {
      h && (i(!y || y.type ? new se(null, e, h) : y), h.abort(), h = null);
    }, t.cancelToken && t.cancelToken.subscribe(r), t.signal && (t.signal.aborted ? r() : t.signal.addEventListener("abort", r)));
    const w = mt(t.url);
    if (w && O.protocols.indexOf(w) === -1) {
      i(new b("Unsupported protocol " + w + ":", b.ERR_BAD_REQUEST, e));
      return;
    }
    h.send(s || null);
  });
}, Hc = (e, a) => {
  const { length: n } = e = e ? e.filter(Boolean) : [];
  if (a || n) {
    let i = new AbortController(), t;
    const s = function(l) {
      if (!t) {
        t = !0, c();
        const r = l instanceof Error ? l : this.reason;
        i.abort(r instanceof b ? r : new se(r instanceof Error ? r.message : r));
      }
    };
    let o = a && setTimeout(() => {
      o = null, s(new b(`timeout ${a} of ms exceeded`, b.ETIMEDOUT));
    }, a);
    const c = () => {
      e && (o && clearTimeout(o), o = null, e.forEach((l) => {
        l.unsubscribe ? l.unsubscribe(s) : l.removeEventListener("abort", s);
      }), e = null);
    };
    e.forEach((l) => l.addEventListener("abort", s));
    const { signal: p } = i;
    return p.unsubscribe = () => d.asap(c), p;
  }
}, Gc = function* (e, a) {
  let n = e.byteLength;
  if (n < a) {
    yield e;
    return;
  }
  let i = 0, t;
  for (; i < n; )
    t = i + a, yield e.slice(i, t), i = t;
}, Wc = async function* (e, a) {
  for await (const n of Vc(e))
    yield* Gc(n, a);
}, Vc = async function* (e) {
  if (e[Symbol.asyncIterator]) {
    yield* e;
    return;
  }
  const a = e.getReader();
  try {
    for (; ; ) {
      const { done: n, value: i } = await a.read();
      if (n)
        break;
      yield i;
    }
  } finally {
    await a.cancel();
  }
}, vi = (e, a, n, i) => {
  const t = Wc(e, a);
  let s = 0, o, c = (p) => {
    o || (o = !0, i && i(p));
  };
  return new ReadableStream({
    async pull(p) {
      try {
        const { done: l, value: r } = await t.next();
        if (l) {
          c(), p.close();
          return;
        }
        let u = r.byteLength;
        if (n) {
          let m = s += u;
          n(m);
        }
        p.enqueue(new Uint8Array(r));
      } catch (l) {
        throw c(l), l;
      }
    },
    cancel(p) {
      return c(p), t.return();
    }
  }, {
    highWaterMark: 2
  });
}, ma = typeof fetch == "function" && typeof Request == "function" && typeof Response == "function", ht = ma && typeof ReadableStream == "function", Jc = ma && (typeof TextEncoder == "function" ? /* @__PURE__ */ ((e) => (a) => e.encode(a))(new TextEncoder()) : async (e) => new Uint8Array(await new Response(e).arrayBuffer())), bt = (e, ...a) => {
  try {
    return !!e(...a);
  } catch {
    return !1;
  }
}, Kc = ht && bt(() => {
  let e = !1;
  const a = new Request(O.origin, {
    body: new ReadableStream(),
    method: "POST",
    get duplex() {
      return e = !0, "half";
    }
  }).headers.has("Content-Type");
  return e && !a;
}), hi = 64 * 1024, en = ht && bt(() => d.isReadableStream(new Response("").body)), ta = {
  stream: en && ((e) => e.body)
};
ma && ((e) => {
  ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((a) => {
    !ta[a] && (ta[a] = d.isFunction(e[a]) ? (n) => n[a]() : (n, i) => {
      throw new b(`Response type '${a}' is not supported`, b.ERR_NOT_SUPPORT, i);
    });
  });
})(new Response());
const Xc = async (e) => {
  if (e == null)
    return 0;
  if (d.isBlob(e))
    return e.size;
  if (d.isSpecCompliantForm(e))
    return (await new Request(O.origin, {
      method: "POST",
      body: e
    }).arrayBuffer()).byteLength;
  if (d.isArrayBufferView(e) || d.isArrayBuffer(e))
    return e.byteLength;
  if (d.isURLSearchParams(e) && (e = e + ""), d.isString(e))
    return (await Jc(e)).byteLength;
}, Yc = async (e, a) => {
  const n = d.toFiniteNumber(e.getContentLength());
  return n ?? Xc(a);
}, Qc = ma && (async (e) => {
  let {
    url: a,
    method: n,
    data: i,
    signal: t,
    cancelToken: s,
    timeout: o,
    onDownloadProgress: c,
    onUploadProgress: p,
    responseType: l,
    headers: r,
    withCredentials: u = "same-origin",
    fetchOptions: m
  } = vt(e);
  l = l ? (l + "").toLowerCase() : "text";
  let x = Hc([t, s && s.toAbortSignal()], o), f;
  const v = x && x.unsubscribe && (() => {
    x.unsubscribe();
  });
  let h;
  try {
    if (p && Kc && n !== "get" && n !== "head" && (h = await Yc(r, i)) !== 0) {
      let R = new Request(a, {
        method: "POST",
        body: i,
        duplex: "half"
      }), M;
      if (d.isFormData(i) && (M = R.headers.get("content-type")) && r.setContentType(M), R.body) {
        const [z, V] = na(
          h,
          _e(ia(p))
        );
        i = vi(R.body, hi, z, V);
      }
    }
    d.isString(u) || (u = u ? "include" : "omit");
    const g = "credentials" in Request.prototype;
    f = new Request(a, {
      ...m,
      signal: x,
      method: n.toUpperCase(),
      headers: r.normalize().toJSON(),
      body: i,
      duplex: "half",
      credentials: g ? u : void 0
    });
    let w = await fetch(f, m);
    const y = en && (l === "stream" || l === "response");
    if (en && (c || y && v)) {
      const R = {};
      ["status", "statusText", "headers"].forEach((X) => {
        R[X] = w[X];
      });
      const M = d.toFiniteNumber(w.headers.get("content-length")), [z, V] = c && na(
        M,
        _e(ia(c), !0)
      ) || [];
      w = new Response(
        vi(w.body, hi, z, () => {
          V && V(), v && v();
        }),
        R
      );
    }
    l = l || "text";
    let T = await ta[d.findKey(ta, l) || "text"](w, e);
    return !y && v && v(), await new Promise((R, M) => {
      be(R, M, {
        data: T,
        headers: L.from(w.headers),
        status: w.status,
        statusText: w.statusText,
        config: e,
        request: f
      });
    });
  } catch (g) {
    throw v && v(), g && g.name === "TypeError" && /Load failed|fetch/i.test(g.message) ? Object.assign(
      new b("Network Error", b.ERR_NETWORK, e, f),
      {
        cause: g.cause || g
      }
    ) : b.from(g, g && g.code, e, f);
  }
}), an = {
  http: Nc,
  xhr: Mc,
  fetch: Qc
};
d.forEach(an, (e, a) => {
  if (e) {
    try {
      Object.defineProperty(e, "name", { value: a });
    } catch {
    }
    Object.defineProperty(e, "adapterName", { value: a });
  }
});
const bi = (e) => `- ${e}`, Zc = (e) => d.isFunction(e) || e === null || e === !1, gt = {
  getAdapter: (e) => {
    e = d.isArray(e) ? e : [e];
    const { length: a } = e;
    let n, i;
    const t = {};
    for (let s = 0; s < a; s++) {
      n = e[s];
      let o;
      if (i = n, !Zc(n) && (i = an[(o = String(n)).toLowerCase()], i === void 0))
        throw new b(`Unknown adapter '${o}'`);
      if (i)
        break;
      t[o || "#" + s] = i;
    }
    if (!i) {
      const s = Object.entries(t).map(
        ([c, p]) => `adapter ${c} ` + (p === !1 ? "is not supported by the environment" : "is not available in the build")
      );
      let o = a ? s.length > 1 ? `since :
` + s.map(bi).join(`
`) : " " + bi(s[0]) : "as no adapter specified";
      throw new b(
        "There is no suitable adapter to dispatch the request " + o,
        "ERR_NOT_SUPPORT"
      );
    }
    return i;
  },
  adapters: an
};
function Ga(e) {
  if (e.cancelToken && e.cancelToken.throwIfRequested(), e.signal && e.signal.aborted)
    throw new se(null, e);
}
function gi(e) {
  return Ga(e), e.headers = L.from(e.headers), e.data = za.call(
    e,
    e.transformRequest
  ), ["post", "put", "patch"].indexOf(e.method) !== -1 && e.headers.setContentType("application/x-www-form-urlencoded", !1), gt.getAdapter(e.adapter || Ne.adapter)(e).then(function(i) {
    return Ga(e), i.data = za.call(
      e,
      e.transformResponse,
      i
    ), i.headers = L.from(i.headers), i;
  }, function(i) {
    return ot(i) || (Ga(e), i && i.response && (i.response.data = za.call(
      e,
      e.transformResponse,
      i.response
    ), i.response.headers = L.from(i.response.headers))), Promise.reject(i);
  });
}
const fa = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((e, a) => {
  fa[e] = function(i) {
    return typeof i === e || "a" + (a < 1 ? "n " : " ") + e;
  };
});
const yi = {};
fa.transitional = function(a, n, i) {
  function t(s, o) {
    return "[Axios v" + aa + "] Transitional option '" + s + "'" + o + (i ? ". " + i : "");
  }
  return (s, o, c) => {
    if (a === !1)
      throw new b(
        t(o, " has been removed" + (n ? " in " + n : "")),
        b.ERR_DEPRECATED
      );
    return n && !yi[o] && (yi[o] = !0, console.warn(
      t(
        o,
        " has been deprecated since v" + n + " and will be removed in the near future"
      )
    )), a ? a(s, o, c) : !0;
  };
};
fa.spelling = function(a) {
  return (n, i) => (console.warn(`${i} is likely a misspelling of ${a}`), !0);
};
function ep(e, a, n) {
  if (typeof e != "object")
    throw new b("options must be an object", b.ERR_BAD_OPTION_VALUE);
  const i = Object.keys(e);
  let t = i.length;
  for (; t-- > 0; ) {
    const s = i[t], o = a[s];
    if (o) {
      const c = e[s], p = c === void 0 || o(c, s, e);
      if (p !== !0)
        throw new b("option " + s + " must be " + p, b.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (n !== !0)
      throw new b("Unknown option " + s, b.ERR_BAD_OPTION);
  }
}
const Qe = {
  assertOptions: ep,
  validators: fa
}, Q = Qe.validators;
let de = class {
  constructor(a) {
    this.defaults = a || {}, this.interceptors = {
      request: new Qn(),
      response: new Qn()
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
  async request(a, n) {
    try {
      return await this._request(a, n);
    } catch (i) {
      if (i instanceof Error) {
        let t = {};
        Error.captureStackTrace ? Error.captureStackTrace(t) : t = new Error();
        const s = t.stack ? t.stack.replace(/^.+\n/, "") : "";
        try {
          i.stack ? s && !String(i.stack).endsWith(s.replace(/^.+\n.+\n/, "")) && (i.stack += `
` + s) : i.stack = s;
        } catch {
        }
      }
      throw i;
    }
  }
  _request(a, n) {
    typeof a == "string" ? (n = n || {}, n.url = a) : n = a || {}, n = fe(this.defaults, n);
    const { transitional: i, paramsSerializer: t, headers: s } = n;
    i !== void 0 && Qe.assertOptions(i, {
      silentJSONParsing: Q.transitional(Q.boolean),
      forcedJSONParsing: Q.transitional(Q.boolean),
      clarifyTimeoutError: Q.transitional(Q.boolean)
    }, !1), t != null && (d.isFunction(t) ? n.paramsSerializer = {
      serialize: t
    } : Qe.assertOptions(t, {
      encode: Q.function,
      serialize: Q.function
    }, !0)), n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0), Qe.assertOptions(n, {
      baseUrl: Q.spelling("baseURL"),
      withXsrfToken: Q.spelling("withXSRFToken")
    }, !0), n.method = (n.method || this.defaults.method || "get").toLowerCase();
    let o = s && d.merge(
      s.common,
      s[n.method]
    );
    s && d.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (f) => {
        delete s[f];
      }
    ), n.headers = L.concat(o, s);
    const c = [];
    let p = !0;
    this.interceptors.request.forEach(function(v) {
      typeof v.runWhen == "function" && v.runWhen(n) === !1 || (p = p && v.synchronous, c.unshift(v.fulfilled, v.rejected));
    });
    const l = [];
    this.interceptors.response.forEach(function(v) {
      l.push(v.fulfilled, v.rejected);
    });
    let r, u = 0, m;
    if (!p) {
      const f = [gi.bind(this), void 0];
      for (f.unshift(...c), f.push(...l), m = f.length, r = Promise.resolve(n); u < m; )
        r = r.then(f[u++], f[u++]);
      return r;
    }
    m = c.length;
    let x = n;
    for (u = 0; u < m; ) {
      const f = c[u++], v = c[u++];
      try {
        x = f(x);
      } catch (h) {
        v.call(this, h);
        break;
      }
    }
    try {
      r = gi.call(this, x);
    } catch (f) {
      return Promise.reject(f);
    }
    for (u = 0, m = l.length; u < m; )
      r = r.then(l[u++], l[u++]);
    return r;
  }
  getUri(a) {
    a = fe(this.defaults, a);
    const n = xn(a.baseURL, a.url, a.allowAbsoluteUrls);
    return dn(n, a.params, a.paramsSerializer);
  }
};
d.forEach(["delete", "get", "head", "options"], function(a) {
  de.prototype[a] = function(n, i) {
    return this.request(fe(i || {}, {
      method: a,
      url: n,
      data: (i || {}).data
    }));
  };
});
d.forEach(["post", "put", "patch"], function(a) {
  function n(i) {
    return function(s, o, c) {
      return this.request(fe(c || {}, {
        method: a,
        headers: i ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: s,
        data: o
      }));
    };
  }
  de.prototype[a] = n(), de.prototype[a + "Form"] = n(!0);
});
let ap = class yt {
  constructor(a) {
    if (typeof a != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function(s) {
      n = s;
    });
    const i = this;
    this.promise.then((t) => {
      if (!i._listeners) return;
      let s = i._listeners.length;
      for (; s-- > 0; )
        i._listeners[s](t);
      i._listeners = null;
    }), this.promise.then = (t) => {
      let s;
      const o = new Promise((c) => {
        i.subscribe(c), s = c;
      }).then(t);
      return o.cancel = function() {
        i.unsubscribe(s);
      }, o;
    }, a(function(s, o, c) {
      i.reason || (i.reason = new se(s, o, c), n(i.reason));
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
  subscribe(a) {
    if (this.reason) {
      a(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(a) : this._listeners = [a];
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(a) {
    if (!this._listeners)
      return;
    const n = this._listeners.indexOf(a);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const a = new AbortController(), n = (i) => {
      a.abort(i);
    };
    return this.subscribe(n), a.signal.unsubscribe = () => this.unsubscribe(n), a.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let a;
    return {
      token: new yt(function(t) {
        a = t;
      }),
      cancel: a
    };
  }
};
function np(e) {
  return function(n) {
    return e.apply(null, n);
  };
}
function ip(e) {
  return d.isObject(e) && e.isAxiosError === !0;
}
const nn = {
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
  NetworkAuthenticationRequired: 511
};
Object.entries(nn).forEach(([e, a]) => {
  nn[a] = e;
});
function wt(e) {
  const a = new de(e), n = Ei(de.prototype.request, a);
  return d.extend(n, de.prototype, a, { allOwnKeys: !0 }), d.extend(n, a, null, { allOwnKeys: !0 }), n.create = function(t) {
    return wt(fe(e, t));
  }, n;
}
const P = wt(Ne);
P.Axios = de;
P.CanceledError = se;
P.CancelToken = ap;
P.isCancel = ot;
P.VERSION = aa;
P.toFormData = da;
P.AxiosError = b;
P.Cancel = P.CanceledError;
P.all = function(a) {
  return Promise.all(a);
};
P.spread = np;
P.isAxiosError = ip;
P.mergeConfig = fe;
P.AxiosHeaders = L;
P.formToJSON = (e) => st(d.isHTMLForm(e) ? new FormData(e) : e);
P.getAdapter = gt.getAdapter;
P.HttpStatusCode = nn;
P.default = P;
const {
  Axios: rl,
  AxiosError: cl,
  CanceledError: pl,
  isCancel: ll,
  CancelToken: ul,
  VERSION: dl,
  all: ml,
  Cancel: fl,
  isAxiosError: xl,
  spread: vl,
  toFormData: hl,
  AxiosHeaders: bl,
  HttpStatusCode: gl,
  formToJSON: yl,
  getAdapter: wl,
  mergeConfig: kl
} = P, xa = "https://gatech.instructure.com", tp = "/api/v1", sp = "/api/graphql";
class C extends Error {
}
const op = {
  maxRetries: 3,
  backoffFactor: 1.5,
  retryStatuses: [429, 500, 502, 503, 504]
};
function rp(e) {
  return new Promise((a) => setTimeout(a, e));
}
function cp(e) {
  if (!e) return null;
  try {
    return new Date(e);
  } catch {
    return null;
  }
}
class pp {
  constructor(a) {
    re(this, "axios");
    re(this, "baseUrl");
    re(this, "apiRoot");
    re(this, "timeoutMs");
    re(this, "retry");
    re(this, "verbose");
    this.baseUrl = (a.baseUrl || xa).replace(/\/$/, ""), this.apiRoot = `${this.baseUrl}${tp}`, this.timeoutMs = a.timeoutMs ?? 3e4, this.retry = a.retry ?? op, this.verbose = !!a.verbose;
    const n = {
      Authorization: `Bearer ${a.token}`,
      Accept: "application/json"
    };
    a.userAgent && (n["User-Agent"] = a.userAgent), this.axios = P.create({
      headers: n,
      timeout: this.timeoutMs,
      validateStatus: () => !0
      // we'll handle errors
    });
  }
  async request(a) {
    let n = 0;
    for (; ; ) {
      n += 1;
      const i = a.url;
      if (this.verbose && i) {
        const s = (a.method || "GET").toUpperCase(), o = a.params ? ` params=${JSON.stringify(a.params)}` : "", c = a.data ? ` data=${typeof a.data == "string" ? "[string]" : JSON.stringify(a.data).slice(0, 200)}` : "";
        console.log(`[${s}] ${i}${o}${c}`);
      }
      const t = await this.axios.request(a);
      if (this.retry.retryStatuses.includes(t.status) && n <= this.retry.maxRetries) {
        const s = t.headers["retry-after"], o = s ? Math.max(500, Number(s) * 1e3 || 0) : this.retry.backoffFactor * n * 1e3;
        this.verbose && console.warn(`Retrying (${n}/${this.retry.maxRetries}) in ${(o / 1e3).toFixed(1)}s due to ${t.status}...`), await rp(o);
        continue;
      }
      if (t.status >= 400) {
        let s;
        try {
          s = t.data;
        } catch {
          s = t.statusText;
        }
        throw new C(`HTTP ${t.status} for ${a.url}: ${JSON.stringify(s, null, 2)}`);
      }
      return t;
    }
  }
  url(a) {
    return /^https?:\/\//.test(a) ? a : `${this.apiRoot}${a}`;
  }
  async get(a, n) {
    return (await this.request({ method: "GET", url: this.url(a), params: n })).data;
  }
  async post(a, n) {
    return (await this.request({ method: "POST", url: this.url(a), data: n })).data;
  }
  async put(a, n) {
    return (await this.request({ method: "PUT", url: this.url(a), data: n })).data;
  }
  async del(a, n) {
    return (await this.request({ method: "DELETE", url: this.url(a), params: n })).data;
  }
  async paginate(a, n) {
    const i = [];
    let t = this.url(a), s = !0;
    for (; t; ) {
      const o = await this.request({ method: "GET", url: t, params: s ? n : void 0 });
      s = !1;
      const c = o.data;
      if (Array.isArray(c))
        i.push(...c);
      else {
        i.push(c);
        break;
      }
      const p = o.headers.link || o.headers.Link;
      if (p) {
        const l = p.split(",").map((r) => r.trim()).find((r) => r.endsWith('rel="next"'));
        if (l) {
          const r = l.match(/<(.*)>/);
          t = r ? r[1] : null;
        } else
          t = null;
      } else
        t = null;
    }
    return i;
  }
  // Convenience REST
  getProfile() {
    return this.get("/users/self/profile");
  }
  listCourses(a = {}) {
    const n = { per_page: a.per_page ?? 100, enrollment_state: a.enrollment_state ?? "active" };
    return a.include && (n["include[]"] = a.include), this.paginate("/courses", n);
  }
  listCourseAssignmentsRest(a, n, i = 100) {
    const t = { per_page: i };
    return n && (t["include[]"] = n), this.paginate(`/courses/${a}/assignments`, t);
  }
  listAssignmentsWithSubmission(a, n = 100) {
    const i = { per_page: n, "include[]": ["submission"] };
    return this.paginate(`/courses/${a}/assignments`, i);
  }
  listAssignmentGroups(a, n = !1) {
    const i = { per_page: 100 }, t = ["rules"];
    return n && t.push("assignments"), i["include[]"] = t, this.paginate(`/courses/${a}/assignment_groups`, i);
  }
  listCourseTabs(a, n = !0) {
    const i = { per_page: 100 };
    return n && (i["include[]"] = ["external"]), this.paginate(`/courses/${a}/tabs`, i);
  }
  // Activity stream (cross-course), useful for announcements aggregation
  listActivityStream(a = {}) {
    const n = {
      per_page: Math.min(100, Math.max(1, a.perPage ?? 100)),
      only_active_courses: a.onlyActiveCourses ?? !0
    };
    return this.paginate("/users/self/activity_stream", n);
  }
  // Announcements (Discussions API)
  listCourseAnnouncements(a, n = 50) {
    const i = { per_page: Math.min(100, Math.max(1, n)), only_announcements: !0 };
    return this.paginate(`/courses/${a}/discussion_topics`, i);
  }
  // Single-page announcements fetch for pagination UI
  listCourseAnnouncementsPage(a, n = 1, i = 10) {
    const t = { per_page: Math.min(100, Math.max(1, i)), page: Math.max(1, Number(n) || 1), only_announcements: !0 };
    return this.get(`/courses/${a}/discussion_topics`, t);
  }
  getAnnouncement(a, n) {
    return this.get(`/courses/${a}/discussion_topics/${n}`);
  }
  listMyEnrollmentsForCourse(a) {
    const n = { user_id: "self", "type[]": ["StudentEnrollment"] };
    return this.paginate(`/courses/${a}/enrollments`, n);
  }
  // GraphQL
  async graphql(a, n, i) {
    const t = `${this.baseUrl}${sp}`, s = { query: a };
    n && (s.variables = n), i && (s.operationName = i);
    const c = (await this.request({ method: "POST", url: t, data: s })).data;
    if (c && c.errors && c.errors.length)
      throw new C(JSON.stringify(c.errors, null, 2));
    return c;
  }
  async graphqlPaginate(a, n, i, t = "after") {
    const s = { ...n };
    let o = s[t];
    const c = [];
    for (; ; ) {
      s[t] = o;
      const p = await this.graphql(a, s), { nodes: l, endCursor: r, hasNextPage: u } = i(p);
      if (c.push(...l), !u || !r) break;
      o = r;
    }
    return c;
  }
  async listCourseAssignmentsGql(a, n = 100) {
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
      { id: String(a), first: n },
      (s) => {
        var c, p, l, r;
        const o = (p = (c = s == null ? void 0 : s.data) == null ? void 0 : c.course) == null ? void 0 : p.assignmentsConnection;
        return {
          nodes: (o == null ? void 0 : o.nodes) ?? [],
          endCursor: ((l = o == null ? void 0 : o.pageInfo) == null ? void 0 : l.endCursor) ?? null,
          hasNextPage: ((r = o == null ? void 0 : o.pageInfo) == null ? void 0 : r.hasNextPage) ?? !1
        };
      }
    );
  }
  async listCourseModulesGql(a, n = 20, i = 50) {
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
        { id: String(a), first: n, itemsFirst: i },
        (c) => {
          var l, r, u, m;
          const p = (r = (l = c == null ? void 0 : c.data) == null ? void 0 : l.course) == null ? void 0 : r.modulesConnection;
          return {
            nodes: (p == null ? void 0 : p.nodes) ?? [],
            endCursor: ((u = p == null ? void 0 : p.pageInfo) == null ? void 0 : u.endCursor) ?? null,
            hasNextPage: ((m = p == null ? void 0 : p.pageInfo) == null ? void 0 : m.hasNextPage) ?? !1
          };
        }
      );
      return await Promise.all(
        s.map(async (c) => {
          var p;
          try {
            const l = await this.paginate(
              `/courses/${a}/modules/${c._id}/items`,
              { per_page: 100 }
            ), r = new Map(l.map((m) => [String(m.id), m])), u = (((p = c.moduleItemsConnection) == null ? void 0 : p.nodes) || []).map((m) => {
              const x = r.get(String(m._id));
              return {
                ...m,
                htmlUrl: x == null ? void 0 : x.html_url,
                contentId: x == null ? void 0 : x.content_id,
                pageUrl: x == null ? void 0 : x.page_url
              };
            });
            return { ...c, moduleItemsConnection: { nodes: u } };
          } catch {
            return c;
          }
        })
      );
    } catch {
      const s = await this.paginate(
        `/courses/${a}/modules`,
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
          nodes: (p.items || []).map((l) => ({
            id: l.id,
            _id: String(l.id),
            __typename: o(l.type),
            title: l.title,
            htmlUrl: l.html_url,
            contentId: l.content_id,
            pageUrl: l.page_url
          }))
        }
      }));
    }
  }
  async listUpcoming(a = {}) {
    const n = a.onlyActiveCourses ?? !0;
    return this.get("/users/self/upcoming_events", { only_active_courses: n });
  }
  async listTodo() {
    return this.get("/users/self/todo");
  }
  async getMySubmission(a, n) {
    return this.get(`/courses/${a}/assignments/${n}/submissions/self`);
  }
  // Pages (REST)
  async listCoursePages(a, n = 100) {
    return this.paginate(`/courses/${a}/pages`, { per_page: n });
  }
  async getCoursePage(a, n) {
    let i = n;
    try {
      if (/^https?:\/\//.test(n)) {
        const s = new URL(n).pathname.split("/"), o = s.indexOf("pages");
        o >= 0 && s[o + 1] && (i = s[o + 1]);
      }
    } catch {
    }
    return this.get(`/courses/${a}/pages/${i}`);
  }
  // Course info + front page
  async getCourseInfo(a) {
    return this.get(`/courses/${a}`, { "include[]": ["syllabus_body"] });
  }
  async getCourseFrontPage(a) {
    return this.get(`/courses/${a}/front_page`);
  }
  // Assignments (REST detail for description)
  async getAssignmentRest(a, n) {
    return this.get(`/courses/${a}/assignments/${n}`);
  }
  // Files
  async getFile(a) {
    return this.get(`/files/${a}`);
  }
  async getFileBytes(a) {
    const i = (await this.get(`/files/${a}`)).url;
    if (!i)
      throw new Error("No file URL available");
    const t = await fetch(i, {
      method: "GET"
      // The signed URL is usually public, so we don't need Authorization header
    });
    if (!t.ok)
      throw new Error(`Failed to fetch file bytes: ${t.statusText}`);
    return t.arrayBuffer();
  }
  async listCourseFolders(a, n = 100) {
    return this.paginate(`/courses/${a}/folders`, { per_page: Math.min(100, Math.max(1, n)) });
  }
  async listFolderFiles(a, n = 100) {
    return this.paginate(`/folders/${a}/files`, { per_page: Math.min(100, Math.max(1, n)) });
  }
  async listCourseFiles(a, n = 100, i = "updated_at", t = "desc") {
    const s = { per_page: Math.min(100, Math.max(1, n)), sort: i, order: t };
    return this.paginate(`/courses/${a}/files`, s);
  }
  async listDueAssignmentsGql(a = {}) {
    const n = a.days ?? 7, i = a.onlyPublished ?? !0, t = a.includeCourseName ?? !0, s = await this.listCourses({ enrollment_state: "active" }), o = /* @__PURE__ */ new Date(), c = new Date(o.getTime() + n * 24 * 60 * 60 * 1e3), p = [];
    for (const l of s) {
      const r = l == null ? void 0 : l.id, u = (l == null ? void 0 : l.name) ?? "";
      if (!r) continue;
      const m = await this.listCourseAssignmentsGql(r, 200);
      for (const x of m) {
        if (i && (x == null ? void 0 : x.state) !== "published") continue;
        const f = cp(x == null ? void 0 : x.dueAt);
        if (f && f >= o && f <= c) {
          const v = {
            course_id: r,
            assignment_rest_id: x != null && x._id ? Number(x._id) : null,
            assignment_graphql_id: x == null ? void 0 : x.id,
            name: x == null ? void 0 : x.name,
            dueAt: f.toISOString(),
            state: x == null ? void 0 : x.state,
            pointsPossible: x == null ? void 0 : x.pointsPossible,
            htmlUrl: x == null ? void 0 : x.htmlUrl
          };
          t && (v.course_name = u), p.push(v);
        }
      }
    }
    return p.sort((l, r) => String(l.dueAt).localeCompare(String(r.dueAt))), p;
  }
}
const Sn = "canvas-desk";
let sa = null, je = xa, Ve = null;
async function En() {
  if (Ve) return Ve;
  try {
    const e = await import("keytar");
    return Ve = e.default ?? e, Ve;
  } catch (e) {
    throw new C(`Failed to load keytar: ${String((e == null ? void 0 : e.message) || e)}`);
  }
}
function kt() {
  const e = we.getPath("userData");
  return W.join(e, "canvas-desk-tokens.json");
}
function Rn() {
  try {
    const e = kt();
    return te.existsSync(e) ? JSON.parse(te.readFileSync(e, "utf-8")) || {} : {};
  } catch {
    return {};
  }
}
function _t(e) {
  try {
    const a = kt();
    te.mkdirSync(W.dirname(a), { recursive: !0 }), te.writeFileSync(a, JSON.stringify(e, null, 2));
  } catch {
  }
}
async function lp(e, a) {
  try {
    return await (await En()).setPassword(Sn, e, a), { insecure: !1 };
  } catch {
    const n = Rn();
    return n[e] = a, _t(n), { insecure: !0 };
  }
}
async function up(e) {
  try {
    return { token: await (await En()).getPassword(Sn, e) || null, insecure: !1 };
  } catch {
    const n = Rn()[e] || null;
    return { token: n, insecure: !!n };
  }
}
async function dp(e) {
  try {
    return await (await En()).deletePassword(Sn, e), { insecure: !1 };
  } catch {
    const a = Rn();
    return delete a[e], _t(a), { insecure: !0 };
  }
}
async function mp(e) {
  je = (e.baseUrl || xa).replace(/\/$/, "");
  let a = !1;
  if (e.token) {
    const t = await lp(je, e.token);
    a = a || t.insecure;
  }
  const n = await up(je);
  a = a || n.insecure;
  const i = e.token || n.token;
  if (!i) throw new C("No Canvas token set. Provide token in init or save one first.");
  return sa = new pp({ token: i, baseUrl: je, verbose: !!e.verbose }), { insecure: a };
}
async function fp(e) {
  const a = (e || je || xa).replace(/\/$/, "");
  await dp(a), sa = null;
}
function j() {
  if (!sa) throw new C("Canvas client is not initialized. Call initCanvas first.");
  return sa;
}
async function xp() {
  return j().getProfile();
}
async function vp(e) {
  return j().listCourses({ enrollment_state: (e == null ? void 0 : e.enrollment_state) || "active" });
}
async function hp(e) {
  return j().listDueAssignmentsGql(e);
}
async function bp(e, a = 200) {
  return j().listCourseAssignmentsGql(e, a);
}
async function gp(e, a = 100) {
  return j().listAssignmentsWithSubmission(e, a);
}
async function yp(e, a = !1) {
  return j().listAssignmentGroups(e, a);
}
async function wp(e) {
  return j().listMyEnrollmentsForCourse(e);
}
async function kp(e, a = !0) {
  return j().listCourseTabs(e, a);
}
async function _p(e) {
  return j().listActivityStream(e);
}
async function Sp(e, a = 50) {
  return j().listCourseAnnouncements(e, a);
}
async function Ep(e, a = 1, n = 10) {
  return j().listCourseAnnouncementsPage(e, a, n);
}
async function Rp(e, a) {
  return j().getAnnouncement(e, a);
}
async function Cp(e, a = 20, n = 50) {
  return j().listCourseModulesGql(e, a, n);
}
async function Ap(e) {
  return j().listUpcoming({ onlyActiveCourses: e == null ? void 0 : e.onlyActiveCourses });
}
async function jp() {
  return j().listTodo();
}
async function Tp(e, a) {
  return j().getMySubmission(e, a);
}
async function Op(e, a = 100) {
  return j().listCoursePages(e, a);
}
async function Fp(e, a) {
  return j().getCoursePage(e, a);
}
async function Pp(e) {
  return j().getCourseInfo(e);
}
async function qp(e) {
  return j().getCourseFrontPage(e);
}
async function Up(e, a) {
  return j().getAssignmentRest(e, a);
}
async function Lp(e) {
  return j().getFile(e);
}
async function Bp(e) {
  return j().getFileBytes(e);
}
async function zp(e, a = 100, n = "updated_at", i = "desc") {
  return j().listCourseFiles(e, a, n, i);
}
async function Np(e, a = 100) {
  return j().listCourseFolders(e, a);
}
async function $p(e, a = 100) {
  return j().listFolderFiles(e, a);
}
const Wa = {
  baseUrl: "https://gatech.instructure.com",
  verbose: !1,
  theme: "light",
  prefetchEnabled: !0,
  cachedCourses: [],
  cachedDue: [],
  queryCache: void 0,
  sidebar: {
    hiddenCourseIds: [],
    customNames: {},
    order: []
  }
};
function St() {
  const e = we.getPath("userData");
  return W.join(e, "canvas-desk.json");
}
function va() {
  try {
    const e = St();
    if (!te.existsSync(e)) return { ...Wa };
    const a = te.readFileSync(e, "utf-8"), n = JSON.parse(a);
    return { ...Wa, ...n };
  } catch {
    return { ...Wa };
  }
}
function Et(e) {
  const n = { ...va(), ...e }, i = St();
  try {
    te.mkdirSync(W.dirname(i), { recursive: !0 }), te.writeFileSync(i, JSON.stringify(n, null, 2));
  } catch {
  }
  return n;
}
const Rt = W.dirname(Pt(import.meta.url));
process.env.APP_ROOT = W.join(Rt, "..");
const tn = process.env.VITE_DEV_SERVER_URL, _l = W.join(process.env.APP_ROOT, "dist-electron"), Ct = W.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = tn ? W.join(process.env.APP_ROOT, "public") : Ct;
let ee, ie = va();
function At() {
  ee = new wi({
    icon: W.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
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
        symbolColor: "#ffffff",
        // good contrast on both light & dark headers
        height: 56
        // match Header height (h-14)
      }
    } : {},
    webPreferences: {
      preload: W.join(Rt, "preload.mjs"),
      webviewTag: !0
    }
  }), ee.webContents.on("did-finish-load", () => {
    ee == null || ee.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), tn ? ee.loadURL(tn) : ee.loadFile(W.join(Ct, "index.html"));
}
we.on("window-all-closed", () => {
  process.platform !== "darwin" && (we.quit(), ee = null);
});
we.on("activate", () => {
  wi.getAllWindows().length === 0 && At();
});
we.whenReady().then(() => {
  ie = va(), At();
});
A.handle("canvas:init", async (e, a) => {
  try {
    const n = (a == null ? void 0 : a.baseUrl) || ie.baseUrl, i = (a == null ? void 0 : a.verbose) ?? ie.verbose, t = await mp({ token: a == null ? void 0 : a.token, baseUrl: n, verbose: i });
    return ie = Et({ baseUrl: n, verbose: i }), { ok: !0, insecure: !!(t != null && t.insecure) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:clearToken", async (e, a) => {
  try {
    return await fp(a), { ok: !0 };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:getProfile", async () => {
  try {
    return { ok: !0, data: await xp() };
  } catch (e) {
    return { ok: !1, error: e instanceof C ? e.message : String((e == null ? void 0 : e.message) || e) };
  }
});
A.handle("canvas:listCourses", async (e, a) => {
  try {
    return { ok: !0, data: await vp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listDueAssignments", async (e, a) => {
  try {
    return { ok: !0, data: await hp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listCourseAssignments", async (e, a, n = 200) => {
  try {
    return { ok: !0, data: await bp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listCourseModulesGql", async (e, a, n = 20, i = 50) => {
  try {
    return { ok: !0, data: await Cp(a, n, i) };
  } catch (t) {
    return { ok: !1, error: t instanceof C ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
A.handle("canvas:listUpcoming", async (e, a) => {
  try {
    return { ok: !0, data: await Ap(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listTodo", async () => {
  try {
    return { ok: !0, data: await jp() };
  } catch (e) {
    return { ok: !1, error: e instanceof C ? e.message : String((e == null ? void 0 : e.message) || e) };
  }
});
A.handle("canvas:getMySubmission", async (e, a, n) => {
  try {
    return { ok: !0, data: await Tp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listCoursePages", async (e, a, n = 100) => {
  try {
    return { ok: !0, data: await Op(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:getCoursePage", async (e, a, n) => {
  try {
    return { ok: !0, data: await Fp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:getAssignmentRest", async (e, a, n) => {
  try {
    return { ok: !0, data: await Up(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:getFile", async (e, a) => {
  try {
    return { ok: !0, data: await Lp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listAssignmentsWithSubmission", async (e, a, n = 100) => {
  try {
    return { ok: !0, data: await gp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listAssignmentGroups", async (e, a, n = !1) => {
  try {
    return { ok: !0, data: await yp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listMyEnrollmentsForCourse", async (e, a) => {
  try {
    return { ok: !0, data: await wp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listCourseTabs", async (e, a, n = !0) => {
  try {
    return { ok: !0, data: await kp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listActivityStream", async (e, a) => {
  try {
    return { ok: !0, data: await _p(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listCourseAnnouncements", async (e, a, n = 50) => {
  try {
    return { ok: !0, data: await Sp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listCourseAnnouncementsPage", async (e, a, n = 1, i = 10) => {
  try {
    return { ok: !0, data: await Ep(a, n, i) };
  } catch (t) {
    return { ok: !1, error: t instanceof C ? t.message : String((t == null ? void 0 : t.message) || t) };
  }
});
A.handle("canvas:getCourseInfo", async (e, a) => {
  try {
    return { ok: !0, data: await Pp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:getCourseFrontPage", async (e, a) => {
  try {
    return { ok: !0, data: await qp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("canvas:listCourseFiles", async (e, a, n = 100, i = "updated_at", t = "desc") => {
  try {
    return { ok: !0, data: await zp(a, n, i, t) };
  } catch (s) {
    return { ok: !1, error: s instanceof C ? s.message : String((s == null ? void 0 : s.message) || s) };
  }
});
A.handle("canvas:listCourseFolders", async (e, a, n = 100) => {
  try {
    return { ok: !0, data: await Np(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:listFolderFiles", async (e, a, n = 100) => {
  try {
    return { ok: !0, data: await $p(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:getAnnouncement", async (e, a, n) => {
  try {
    return { ok: !0, data: await Rp(a, n) };
  } catch (i) {
    return { ok: !1, error: i instanceof C ? i.message : String((i == null ? void 0 : i.message) || i) };
  }
});
A.handle("canvas:getFileBytes", async (e, a) => {
  try {
    return { ok: !0, data: await Bp(a) };
  } catch (n) {
    return { ok: !1, error: n instanceof C ? n.message : String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("app:openExternal", async (e, a) => {
  try {
    return await Ft.openExternal(a), { ok: !0 };
  } catch (n) {
    return { ok: !1, error: String((n == null ? void 0 : n.message) || n) };
  }
});
A.handle("config:get", async () => {
  try {
    return ie = va(), { ok: !0, data: ie };
  } catch (e) {
    return { ok: !1, error: String((e == null ? void 0 : e.message) || e) };
  }
});
A.handle("config:set", async (e, a) => {
  try {
    return ie = Et(a), { ok: !0, data: ie };
  } catch (n) {
    return { ok: !1, error: String((n == null ? void 0 : n.message) || n) };
  }
});
export {
  _l as MAIN_DIST,
  Ct as RENDERER_DIST,
  tn as VITE_DEV_SERVER_URL
};
