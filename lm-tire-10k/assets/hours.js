/* L&M Tire opening hours. This is the one place to change hours.
   Times are Worcester time, 24-hour clock.
   holidays: add a date (YYYY-MM-DD) with "closed", or with special hours like ["08:00","12:00"].
   The whole site (open/closed badges, buttons, hours table, Google data) follows this file. */
window.LM_HOURS = {
  weekly: {            /* 0 = Sunday ... 6 = Saturday. Missing day = closed. */
    1: ['08:00', '18:00'],
    2: ['08:00', '18:00'],
    3: ['08:00', '18:00'],
    4: ['08:00', '18:00'],
    5: ['08:00', '18:00'],
    6: ['08:00', '12:00']
  },
  holidays: {
    /* Waiting for the owner to confirm. Examples:
    '2026-12-24': ['08:00', '12:00'],
    '2026-12-25': 'closed',
    */
  },
  holidayNames: {
    /* optional names shown on the site, e.g. '2026-12-25': 'Christmas' */
  }
};
(function (H) {
  var m = function (t) { var p = String(t).split(':'); return +p[0] * 60 + (+p[1] || 0); };
  var ny = function (k) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + (k || 0) * 864e5)); };
  /* minutes [open, close] for a date k days from today (Worcester time), or null when closed */
  H.on = function (k) {
    var ds = ny(k), h = H.holidays[ds];
    if (h === 'closed' || h === null) return null;
    if (h && h.length === 2) return [m(h[0]), m(h[1])];
    var wd = new Date(ds + 'T12:00:00Z').getUTCDay(), w = H.weekly[wd];
    return w ? [m(w[0]), m(w[1])] : null;
  };
  H.dateStr = ny;
  H.isHoliday = function (k) { return Object.prototype.hasOwnProperty.call(H.holidays, ny(k)); };
})(window.LM_HOURS);
