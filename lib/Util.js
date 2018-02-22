const ut = require('utjs');

class Util {
  static get EVENT_SEPARATOR() {
    return '|';
  }

  static get LIST_SEPARATOR() {
    return ',';
  }

  /**
   * @param {Object} [opts]
   * @param {Function} [cb]
   * @return {Object}
   */
  static checkEmitOpts(opts, cb) {
    cb = ut.isFunction(opts) ? opts : cb;
    opts = ut.isObject(opts) ? opts : {};

    if (opts.sockets !== undefined) {
      opts.sockets = ut.isString(opts.sockets) ? [opts.sockets] : opts.sockets;
    }

    if (opts.rooms !== undefined) {
      opts.rooms = ut.isString(opts.rooms) ? [opts.rooms] : opts.rooms;
    }

    if (opts.except !== undefined) {
      opts.except = ut.isString(opts.except) ? [opts.except] : opts.except;
    }

    if (cb !== undefined) {
      opts.cb = cb;
    }

    return opts;
  }

  /**
   * @param {String} event The event name
   * @param {String[]} [target] List of socket ids or rooms.
   * @param {String[]} [except] List of socket ids.
   * @return {String} The serialized event.
   */
  static serializeEvent(event, target, except) {
    if (target !== undefined) {
      event += `${Util.EVENT_SEPARATOR}${target.join(Util.LIST_SEPARATOR)}`;
    }

    if (except !== undefined) {
      event += `${Util.EVENT_SEPARATOR}${except.join(Util.LIST_SEPARATOR)}`;
    }

    return event;
  }

  /**
   * @param {String} event The serialized event.
   * @return {Object}
   */
  static deserializeEvent(event) {
    const splitted = event.split(Util.EVENT_SEPARATOR);
    const eventObj = { event: splitted[0] };

    if (splitted.length >= 2) {
      eventObj.target = splitted[1].split(Util.LIST_SEPARATOR);
    }

    if (splitted.length >= 3) {
      eventObj.except = splitted[2].split(Util.LIST_SEPARATOR);
    }

    return eventObj;
  }
}

module.exports = Util;
