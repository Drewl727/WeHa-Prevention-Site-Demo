/* West Hartford Prevention Partnership — script.js */

document.addEventListener('DOMContentLoaded', function () {

  // ── Mobile nav toggle ─────────────────────────────
  var toggle = document.querySelector('.nav-toggle');
  var nav    = document.querySelector('.site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Active nav link ───────────────────────────────
  var page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav ul a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // ── Hero slideshow ────────────────────────────────
  var slidesContainer = document.getElementById('hero-slides');
  if (slidesContainer) {
    var base3 = document.querySelector('base') ? document.querySelector('base').href : '';
    var heroPath = base3 ? base3 + 'data/hero-images.json' : 'data/hero-images.json';

    fetch(heroPath)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var images = (data.images || []).filter(function (img) { return img && img.src; });
        if (images.length === 0) return;

        // Build slides — all start off-right except the first
        images.forEach(function (img, i) {
          var slide = document.createElement('div');
          slide.className = i === 0 ? 'hero-slide active' : 'hero-slide slide-right';
          slide.style.backgroundImage = 'url(' + esc(img.src) + ')';
          if (img.alt) { slide.setAttribute('role', 'img'); slide.setAttribute('aria-label', img.alt); }
          slidesContainer.appendChild(slide);
        });

        if (images.length < 2) return;

        // Build dots and append to hero section
        var dotsEl = document.createElement('div');
        dotsEl.className = 'hero-dots';
        dotsEl.setAttribute('aria-label', 'Slideshow navigation');
        images.forEach(function (img, i) {
          var dot = document.createElement('button');
          dot.className = i === 0 ? 'hero-dot active' : 'hero-dot';
          dot.setAttribute('aria-label', 'Photo ' + (i + 1));
          dot.addEventListener('click', function () { goTo(i); });
          dotsEl.appendChild(dot);
        });
        slidesContainer.parentElement.appendChild(dotsEl);

        var current = 0;
        var timer = null;

        function goTo(next) {
          if (next === current) return;
          var slides = slidesContainer.querySelectorAll('.hero-slide');
          var dots   = dotsEl.querySelectorAll('.hero-dot');
          var dir    = next > current ? 1 : -1;

          // Snap incoming slide to correct off-screen side without animating
          slides[next].style.transition = 'none';
          slides[next].classList.remove('active', 'slide-left', 'slide-right');
          slides[next].classList.add(dir > 0 ? 'slide-right' : 'slide-left');
          slides[next].getBoundingClientRect(); // force reflow

          // Animate both slides simultaneously
          slides[next].style.transition = '';
          slides[current].classList.remove('active');
          slides[current].classList.add(dir > 0 ? 'slide-left' : 'slide-right');
          slides[next].classList.remove('slide-left', 'slide-right');
          slides[next].classList.add('active');

          dots[current].classList.remove('active');
          dots[next].classList.add('active');
          current = next;

          clearInterval(timer);
          timer = setInterval(advance, 4500);
        }

        function advance() { goTo((current + 1) % images.length); }

        timer = setInterval(advance, 4500);
      })
      .catch(function () { /* no images — solid navy shows as fallback */ });
  }

  // ── Announcement banner ───────────────────────────
  var announcementBanner = document.getElementById('announcement-banner');
  if (announcementBanner) {
    var base2 = document.querySelector('base') ? document.querySelector('base').href : '';
    var settingsPath = base2 ? base2 + 'data/settings.json' : 'data/settings.json';

    fetch(settingsPath)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var a = data.announcement;
        if (a && a.enabled && a.message) {
          var msg = esc(a.message);
          if (a.link_text && a.link_url) {
            msg += ' <a href="' + esc(a.link_url) + '">' + esc(a.link_text) + '</a>';
          }
          announcementBanner.innerHTML = '<div class="container"><p>' + msg + '</p></div>';
          announcementBanner.style.display = 'block';
        }
      })
      .catch(function () { /* silently ignore */ });
  }

});


// ── Dynamic events loader ─────────────────────────
// Called from events.html and index.html with a container id and optional limit
function loadEvents(containerId, limit) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Determine path to data file (handle subdirectory deployments)
  var base = document.querySelector('base') ? document.querySelector('base').href : '';
  var dataPath = base ? base + 'data/events.json' : 'data/events.json';

  container.innerHTML = '<p style="color:var(--text-light);font-size:.9rem;">Loading events&hellip;</p>';

  fetch(dataPath)
    .then(function (res) {
      if (!res.ok) throw new Error('Could not load events.');
      return res.json();
    })
    .then(function (data) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);

      var upcoming = (data.events || [])
        .filter(function (e) {
          // Parse as local date (avoid UTC offset shifting the day)
          var parts = e.date.split('-');
          var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
          return d >= today;
        })
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date);
        });

      if (typeof limit === 'number') {
        upcoming = upcoming.slice(0, limit);
      }

      if (upcoming.length === 0) {
        container.innerHTML =
          '<p style="color:var(--text-light);font-size:.9rem;">No upcoming events at this time. ' +
          '<a href="https://lp.constantcontactpages.com/sl/iolsR2A" target="_blank" rel="noopener">Sign up for email updates</a> ' +
          'to be notified when new events are added.</p>';
        return;
      }

      var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var html = '';

      upcoming.forEach(function (evt) {
        var parts = evt.date.split('-');
        var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        html +=
          '<div class="event-item">' +
            '<div class="event-date">' +
              '<span class="month">' + MONTHS[d.getMonth()] + '</span>' +
              '<span class="day">'   + d.getDate()           + '</span>' +
            '</div>' +
            '<div class="event-info">' +
              '<h4>' + esc(evt.title) + '</h4>' +
              '<p>'  + esc(evt.description) + '</p>' +
              '<div class="event-meta">' +
                '<span>' + esc(evt.time)     + '</span>' +
                '<span>' + esc(evt.location) + '</span>' +
                (evt.address ? '<span>' + esc(evt.address) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
      });

      container.innerHTML = html;
    })
    .catch(function (err) {
      console.warn('Events load failed:', err);
      container.innerHTML =
        '<p style="color:var(--text-light);font-size:.9rem;">Events could not be loaded. ' +
        'Please contact <a href="mailto:gretchen.levitz@westhartfordct.gov">gretchen.levitz@westhartfordct.gov</a> ' +
        'for the current meeting schedule.</p>';
    });
};


// ── HTML escape helper ────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}
