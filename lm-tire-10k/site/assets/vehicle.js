/* Year / make / model picker. Models come from the U.S. government vehicle database (NHTSA vPIC);
   if it can't be reached, the customer types the model. Only the year and make are sent to NHTSA. */
(function () {
  'use strict';
  var X = window.LM_TXT, MAKES = window.LM_MAKES || [];
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var cache = {};
  window.LM_vehicle = function (box, prefix) {
    var y = new Date().getFullYear() + 1, years = '';
    for (var i = y; i >= 1985; i--) years += '<option>' + i + '</option>';
    box.innerHTML =
      '<div class="veh">' +
      '<div class="field"><label for="' + prefix + 'Y">' + esc(X.year) + '</label><select id="' + prefix + 'Y" name="year"><option value="">' + esc(X.pick) + '</option>' + years + '</select></div>' +
      '<div class="field"><label for="' + prefix + 'M">' + esc(X.make) + '</label><select id="' + prefix + 'M" name="make"><option value="">' + esc(X.pick) + '</option>' + MAKES.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '<option value="__other">' + esc(X.other) + '</option></select>' +
      '<input id="' + prefix + 'Mo" name="make_other" placeholder="' + esc(X.type_make) + '" maxlength="40" hidden aria-label="' + esc(X.type_make) + '"></div>' +
      '<div class="field"><label for="' + prefix + 'D">' + esc(X.model) + '</label><input id="' + prefix + 'D" name="model" list="' + prefix + 'L" autocomplete="off" maxlength="50" placeholder="' + esc(X.type_model) + '"><datalist id="' + prefix + 'L"></datalist><small class="hint" id="' + prefix + 'H" aria-live="polite"></small></div>' +
      '</div>';
    var ys = box.querySelector('#' + prefix + 'Y'), ms = box.querySelector('#' + prefix + 'M'), mo = box.querySelector('#' + prefix + 'Mo'),
        md = box.querySelector('#' + prefix + 'D'), dl = box.querySelector('#' + prefix + 'L'), hint = box.querySelector('#' + prefix + 'H');
    function load() {
      var make = ms.value, year = ys.value; dl.innerHTML = ''; hint.textContent = '';
      mo.hidden = make !== '__other';
      if (!make || make === '__other' || !year) return;
      var key = make + '|' + year;
      var fill = function (list) { dl.innerHTML = list.map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); hint.textContent = ''; };
      if (cache[key]) return fill(cache[key]);
      hint.textContent = X.models_loading;
      var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
      fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/' + encodeURIComponent(make) + '/modelyear/' + year + '/vehicletype/car?format=json', ctl ? { signal: ctl.signal } : {})
        .then(function (r) { return r.json(); })
        .then(function (j) {
          clearTimeout(t);
          var list = (j.Results || []).map(function (r) { return r.Model_Name; });
          return fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/' + encodeURIComponent(make) + '/modelyear/' + year + '/vehicletype/mpv?format=json').then(function (r) { return r.json(); }).then(function (k) {
            list = list.concat((k.Results || []).map(function (r) { return r.Model_Name; }));
            return fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/' + encodeURIComponent(make) + '/modelyear/' + year + '/vehicletype/truck?format=json').then(function (r) { return r.json(); }).then(function (k2) { return list.concat((k2.Results || []).map(function (r) { return r.Model_Name; })); });
          }).catch(function () { return list; });
        })
        .then(function (list) {
          list = Array.from(new Set(list)).sort();
          if (!list.length) throw new Error('empty');
          cache[key] = list; fill(list);
        })
        .catch(function () { clearTimeout(t); hint.textContent = X.models_fail; });
    }
    ys.addEventListener('change', load); ms.addEventListener('change', load);
    var want = ms.getAttribute('data-want'); if (want) ms.value = want;
    return {
      text: function () {
        var make = ms.value === '__other' ? mo.value.trim() : ms.value;
        return [ys.value, make, md.value.trim()].filter(Boolean).join(' ');
      },
      set: function (o) { if (!o) return; ys.value = o.y || ''; ms.value = o.m || ''; mo.value = o.mo || ''; md.value = o.d || ''; mo.hidden = ms.value !== '__other'; },
      get: function () { return { y: ys.value, m: ms.value, mo: mo.value, d: md.value }; }
    };
  };
})();
