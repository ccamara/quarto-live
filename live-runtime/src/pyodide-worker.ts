import * as Comlink from 'comlink';
import { loadPyodide, PyodideAPI } from 'pyodide';
import { comlinkTransfer, imageBitmapTransfer, mapTransfer, proxyTransfer } from './pyodide-proxy';
import { PyProxy } from 'pyodide/ffi';

declare global {
  interface Window {
    pyodide?: PyodideAPIWorker;
  }
}

export type PyodideWorker = {
  init: typeof init;
}

export type PyodideAPIWorker = PyodideAPI & {
  _module: {
    PyProxy_getPtr: (obj: PyProxy) => number;
  };
  _FS: typeof FS;
}

const FS = {
  mkdirTree(path: string) {
    self.pyodide._FS.mkdirTree(path);
  },
  writeFile(path: string, data: ArrayBufferView) {
    self.pyodide._FS.writeFile(path, data);
  }
}

async function init(options) {
  self.pyodide = await loadPyodide(options) as PyodideAPIWorker;
  self.pyodide.registerComlink(Comlink);
  self.pyodide._FS = self.pyodide.FS;
  self.pyodide.FS = { ...self.pyodide.FS, ...FS };
  Comlink.transferHandlers.set("PyProxy", proxyTransfer);
  Comlink.transferHandlers.set("Comlink", comlinkTransfer);
  Comlink.transferHandlers.set("ImageBitmap", imageBitmapTransfer);
  Comlink.transferHandlers.set("Map", mapTransfer);

  // FIXME: Why does this cause the error `Unserializable return value`
  Comlink.transferHandlers.delete("throw");

  return Comlink.proxy(self.pyodide);
}

Comlink.expose({ init });
