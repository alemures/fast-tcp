const ut = require('utjs');

class Util {
  static get EVENT_SEPARATOR() {
    return '|';
  }

  static get LIST_SEPARATOR() {
    return ',';
  }

  static checkEmitOpts(opts, cb) {
    cb = ut.isFunction(opts) ? opts : cb;
    opts = ut.isObject(opts) ? opts : {};

    opts.sockets = Util._toArray(opts.sockets);
    opts.rooms = Util._toArray(opts.rooms);
    opts.except = Util._toArray(opts.except);
    opts.broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;
    opts.cb = ut.isFunction(cb) ? cb : null;

    return opts;
  }

  /**
   * @param {String} event The event name
   * @param {String[]} [target] List of socket ids or rooms.
   * @param {String[]} [except] List of socket ids.
   * @return {String}
   */
  static serializeEvent(event, target, except) {
    if (target !== undefined && target.length > 0) {
      event += `${Util.EVENT_SEPARATOR}${target.join(Util.LIST_SEPARATOR)}`;
    }

    if (except !== undefined && except.length > 0) {
      event += `${Util.EVENT_SEPARATOR}${except.join(Util.LIST_SEPARATOR)}`;
    }

    return event;
  }

  /**
   * @param {String} event The event.
   * @return {Object}
   */
  static deserializeEvent(event) {
    const splitted = event.split(Util.EVENT_SEPARATOR);
    return {
      event: splitted[0],
      target: splitted[1] !== undefined ? splitted[1].split(Util.LIST_SEPARATOR) : null,
      except: splitted[2] !== undefined ? splitted[2].split(Util.LIST_SEPARATOR) : null
    };
  }

  static _toArray(value) {
    if (ut.isArray(value)) {
      return value;
    } else if (ut.isString(value)) {
      return [value];
    }
    return [];
  }
}

module.exports = Util;
