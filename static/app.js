// Footer year (only present on pages w/ #year element)
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---- Tour calendar (only runs on shows page) ----
const grid = document.getElementById("cal-grid");
if (grid) {
  // Placeholder shows. Replace dates/venues when confirmed.
  // Format: { date: 'YYYY-MM-DD', venue, city, note, ticketUrl, status: 'on-sale' | 'tba' | 'soon' }
  const SHOWS = [
    { date: "2026-06-13", venue: "[Venue Name]", city: "Colorado Springs, CO", note: "all ages", ticketUrl: "#", status: "tba" },
    { date: "2026-07-04", venue: "[Venue Name]", city: "Manitou Springs, CO", note: "21+", ticketUrl: "#", status: "tba" },
    { date: "2026-07-26", venue: "[Venue Name]", city: "Denver, CO", note: "co-headline", ticketUrl: "#", status: "tba" },
    { date: "2026-08-15", venue: "[Venue Name]", city: "Pueblo, CO", note: "all ages", ticketUrl: "#", status: "tba" },
    { date: "2026-09-12", venue: "[Venue Name]", city: "Fort Collins, CO", note: "21+", ticketUrl: "#", status: "tba" }
  ];

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTHS_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let activeKey = null;

  const monthName = document.getElementById("cal-month-name");
  const yearLabel = document.getElementById("cal-year");
  const list = document.getElementById("show-list");

  const showByKey = new Map(SHOWS.map(s => [s.date, s]));
  const fmtKey = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  function renderCalendar() {
    grid.innerHTML = "";
    monthName.textContent = MONTHS[viewMonth];
    yearLabel.textContent = viewYear;

    DOW.forEach(d => {
      const el = document.createElement("div");
      el.className = "dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const cell = document.createElement("div");
      cell.className = "cal-day muted";
      cell.innerHTML = `<span>${d}</span>`;
      grid.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = fmtKey(viewYear, viewMonth, d);
      const cell = document.createElement("div");
      cell.className = "cal-day";
      if (
        d === today.getDate() &&
        viewMonth === today.getMonth() &&
        viewYear === today.getFullYear()
      ) cell.classList.add("today");
      if (showByKey.has(key)) {
        cell.classList.add("has-show");
        cell.dataset.key = key;
        cell.addEventListener("click", () => setActive(key));
      }
      if (key === activeKey) cell.classList.add("active");
      cell.innerHTML = `<span>${d}</span><span class="dot"></span>`;
      grid.appendChild(cell);
    }

    const total = startDay + daysInMonth;
    const tail = (7 - (total % 7)) % 7;
    for (let i = 1; i <= tail; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-day muted";
      cell.innerHTML = `<span>${i}</span>`;
      grid.appendChild(cell);
    }
  }

  function renderList() {
    list.innerHTML = "";
    const upcoming = SHOWS
      .filter(s => new Date(s.date) >= new Date(today.toDateString()))
      .sort((a,b) => a.date.localeCompare(b.date));

    if (upcoming.length === 0) {
      list.innerHTML = `<div class="empty">No upcoming dates. Check back soon.</div>`;
      return;
    }

    upcoming.forEach(s => {
      const [y, m, d] = s.date.split("-").map(Number);
      const card = document.createElement("div");
      card.className = "show-card" + (s.status === "tba" ? " tba" : "") + (s.date === activeKey ? " active" : "");
      card.dataset.key = s.date;
      card.innerHTML = `
        <div class="d">
          <span class="day-num">${d}</span>
          <span class="mo">${MONTHS_SHORT[m-1]}</span>
        </div>
        <div class="info">
          <strong>${s.venue}</strong>
          <span>${s.city} · ${s.note}</span>
        </div>
        <a class="ticket" href="${s.ticketUrl}" target="_blank" rel="noopener">${s.status === "tba" ? "TBA" : "Tickets"}</a>
      `;
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("ticket")) return;
        setActive(s.date);
        const [yy, mm] = s.date.split("-").map(Number);
        viewYear = yy;
        viewMonth = mm - 1;
        renderCalendar();
      });
      list.appendChild(card);
    });
  }

  function setActive(key) {
    activeKey = activeKey === key ? null : key;
    renderCalendar();
    renderList();
  }

  document.getElementById("cal-prev").addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });
  document.getElementById("cal-today").addEventListener("click", () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    renderCalendar();
  });

  renderCalendar();
  renderList();
}

// Contact form (only on contact page)
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    contactForm.querySelector("button").textContent = "Sent ·";
  });
}
