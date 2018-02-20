class Util {
  static checkOpts(opts) {
    opts.sockets = ut.isArray(opts.sockets) ? opts.sockets :
      ut.isString(opts.sockets) ? [opts.sockets] : [];
    opts.rooms = ut.isArray(opts.rooms) ? opts.rooms :
      ut.isString(opts.rooms) ? [opts.rooms] : [];
    opts.except = ut.isArray(opts.except) ? opts.except :
      ut.isString(opts.except) ? [opts.except] : [];
  }
}

module.exports = Util;
