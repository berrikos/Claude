// Product screens drawn in HTML/CSS — the kitchen screen, till, kiosk, order
// screen, owner dashboard, AI chat and a delivery-app menu. They show the
// technology without screenshots, stay sharp at any size and weigh almost
// nothing. All figures are examples (no prices, no percentages — brand rule).
import { icon } from './layout.mjs';

const CH = {
  ue: ['Uber Eats', 'ch-ue'],
  dd: ['DoorDash', 'ch-dd'],
  web: ['Website', 'ch-web'],
  kiosk: ['Kiosk', 'ch-kiosk'],
  till: ['Counter', 'ch-till'],
};

// Pool the live kitchen screen cycles through (main.js).
export const TICKETS = [
  { ch: 'ue', n: 'A41', t: 252, items: ['2 × Chicken melt', '1 × Fries'], note: 'Driver arriving · PIN 4821' },
  { ch: 'till', n: '118', t: 107, items: ['1 × Breakfast roll', '2 × Flat white'] },
  { ch: 'dd', n: '7F2', t: 570, items: ['1 × Lamb wrap', '1 × Brownie'], late: true },
  { ch: 'kiosk', n: 'K09', t: 38, items: ['1 × Double burger', '1 × Shake'] },
  { ch: 'web', n: 'W23', t: 12, items: ['3 × Bacon & egg roll'] , note: 'Pickup 8:15' },
  { ch: 'ue', n: 'B12', t: 5, items: ['1 × Smash burger', '1 × Onion rings'], note: 'Driver 3 min away' },
  { ch: 'dd', n: '9C4', t: 2, items: ['2 × Ham & cheese toastie'] },
  { ch: 'till', n: '119', t: 0, items: ['1 × Big breakfast', '1 × Latte'] },
  { ch: 'kiosk', n: 'K10', t: 0, items: ['2 × Kebab wrap', '1 × Chips'] },
  { ch: 'ue', n: 'C77', t: 0, items: ['1 × Waffle stack'], note: 'Driver arriving · PIN 1395' },
  { ch: 'web', n: 'W24', t: 0, items: ['1 × Steak melt', '1 × Iced latte'], note: 'Pickup 8:30' },
  { ch: 'dd', n: '2B8', t: 0, items: ['1 × Cheeseburger', '1 × Sundae'] },
];

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function ticket(k) {
  const [label, cls] = CH[k.ch];
  return `<div class="tk ${cls}${k.late ? ' is-late' : ''}">
    <div class="tk-top"><span>${label}</span><span class="tk-time" data-t="${k.t}">${mmss(k.t)}</span></div>
    <p class="tk-num">#${k.n}</p>
    <ul>${k.items.map((i) => `<li>${i}</li>`).join('')}</ul>
    ${k.note ? `<p class="tk-note">${k.note}</p>` : ''}${k.late ? '<p class="tk-note tk-late">Running late</p>' : ''}
    <span class="tk-ready">Ready</span>
  </div>`;
}

export const kdsScreen = (live = true) => `<div class="scr scr-kds"${live ? ' data-live-kds' : ''}>
  <div class="scr-bar"><span>${icon('screen')} Kitchen</span><span class="scr-chips"><i class="ch-ue"></i><i class="ch-dd"></i><i class="ch-web"></i><i class="ch-kiosk"></i><i class="ch-till"></i></span><span class="scr-clock">7:42</span></div>
  <div class="kds-grid">${TICKETS.slice(0, 8).map(ticket).join('')}</div>
  ${live ? `<template>${TICKETS.map(ticket).join('')}</template>` : ''}
</div>`;

export const tillScreen = () => `<div class="scr scr-till">
  <div class="till-items">
    <div class="till-cats"><b>Breakfast</b><span>Melts</span><span>Burgers</span><span>Drinks</span></div>
    <div class="till-grid">${['Big breakfast', 'Bacon & egg roll', 'Eggs on toast', 'Smashed avo', 'Breakfast wrap', 'Hash browns', 'Flat white', 'Latte', 'Cold brew'].map((x, i) => `<span class="ti ti-${i % 3}">${x}</span>`).join('')}</div>
  </div>
  <div class="till-order">
    <p class="till-h">Order 119 · Dine in</p>
    <ul><li><b>1</b> Big breakfast<small>Extra hash brown</small></li><li><b>1</b> Latte<small>Oat milk</small></li><li><b>2</b> Flat white</li></ul>
    <span class="till-pay">Charge</span>
  </div>
</div>`;

export const kioskScreen = () => `<div class="scr scr-kiosk">
  <p class="kiosk-h">Order here</p>
  <p class="kiosk-sub">Tap to start</p>
  <div class="kiosk-grid">${[['burger', 'Burgers'], ['pan', 'Melts'], ['cup', 'Breakfast'], ['star', 'Desserts']].map(([ic, t]) => `<span>${icon(ic)}<b>${t}</b></span>`).join('')}</div>
  <span class="kiosk-cta">View order · 2 items</span>
</div>`;

export const boardScreen = () => `<div class="scr scr-board">
  <div class="board-col"><p>Preparing</p><div class="board-nums" data-board-prep><span>K09</span><span>119</span><span>W23</span><span>A41</span></div></div>
  <div class="board-col board-ready"><p>Ready</p><div class="board-nums" data-board-ready><span>118</span><span>K07</span></div></div>
</div>`;

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const ORDERS = [4, 18, 31, 24, 15, 19, 34, 29, 12, 9, 11, 16, 27, 22, 10];

export function dashScreen() {
  const max = Math.max(...ORDERS);
  const bars = ORDERS.map((v, i) => {
    const h = Math.round((v / max) * 70);
    return `<rect x="${i * 20 + 4}" y="${80 - h}" width="12" height="${h}" rx="3" class="${i === 6 ? 'bar-hi' : ''}" style="--i:${i}"/>`;
  }).join('');
  const labels = HOURS.filter((_, i) => i % 3 === 0).map((h, j) => `<text x="${j * 60 + 10}" y="94">${h > 12 ? h - 12 + 'pm' : h + (h === 12 ? 'pm' : 'am')}</text>`).join('');
  return `<div class="scr scr-dash">
    <div class="dash-top"><span>Today · all locations</span><span class="dash-live"><i></i>Live</span></div>
    <div class="dash-kpis">
      <div><small>Orders</small><b data-count="281">281</b></div>
      <div><small>Avg. ticket time</small><b>7:40</b></div>
      <div><small>Staff on</small><b data-count="9">9</b></div>
    </div>
    <svg class="dash-chart" viewBox="0 0 300 100" role="img" aria-label="Example: orders by hour">${bars}${labels}</svg>
    <ul class="dash-ch">${[['Uber Eats', 'ch-ue', 92], ['Counter', 'ch-till', 71], ['DoorDash', 'ch-dd', 58], ['Kiosk', 'ch-kiosk', 37], ['Website', 'ch-web', 23]].map(([t, c, n]) => `<li><i class="${c}"></i>${t}<span style="--w:${Math.round((n / 92) * 100)}"></span><b>${n}</b></li>`).join('')}</ul>
  </div>`;
}

export const CHAT = [
  ['in', '6:00am', 'Morning! Yesterday: 281 orders across all stores. Busiest hour 12–1pm. Full summary attached.'],
  ['in', '7:12am', 'Replied to 9 customer emails. 2 need you — flagged at the top of your inbox.'],
  ['in', '7:30am', 'Milk and bread are low. Order placed with your usual supplier — arriving tomorrow 6am.'],
  ['out', '7:41am', 'Can you move Thursday’s meeting to Friday?'],
  ['in', '7:41am', 'Done. Moved to Friday 10am and told the team.'],
  ['in', '11:40am', 'Answered 4 new Google reviews in your voice.'],
];

export const chatPhone = (live = true) => `<div class="scr scr-chat"${live ? ' data-live-chat' : ''}>
  <div class="chat-head"><span class="chat-av">${icon('spark')}</span><div><b>Your assistant</b><small>online</small></div></div>
  <ol class="chat-feed">${CHAT.map(([dir, t, m]) => `<li class="msg msg-${dir}"><span>${m}</span><time>${t}</time></li>`).join('')}</ol>
  <div class="chat-input"><span>Message</span>${icon('arrow')}</div>
</div>`;

export const deliveryMenu = () => `<div class="scr scr-app">
  <div class="app-hero"></div>
  <div class="app-body">
    <p class="app-title">Chicken melt</p>
    <p class="app-desc">Grilled chicken, three cheeses, slaw on toasted sourdough.</p>
    <p class="app-h">Choose your extras</p>
    <ul class="app-opts">${[['Extra cheese', true], ['Jalapeños', true], ['Hash brown', false], ['Chipotle mayo', true]].map(([t, on]) => `<li><span class="app-ph"></span>${t}<i class="${on ? 'on' : ''}"></i></li>`).join('')}</ul>
    <span class="app-add">Add to order</span>
  </div>
</div>`;

export const storefronts = () => `<div class="fronts" aria-hidden="true">
  <div class="fronts-kitchen">${icon('kitchen')}<b>Your kitchen</b></div>
  <div class="fronts-list">${[['pan', 'Melts'], ['burger', 'Burgers'], ['kitchen', 'Kebabs & wraps'], ['cup', 'Breakfast'], ['star', 'Desserts']].map(([ic, t], i) => `<span style="--i:${i}">${icon(ic)}${t}</span>`).join('')}</div>
</div>`;

// Device frames
export const tablet = (inner, cls = '') => `<div class="dev dev-tablet ${cls}">${inner}</div>`;
export const phone = (inner, cls = '') => `<div class="dev dev-phone ${cls}"><span class="dev-notch"></span>${inner}</div>`;
export const tv = (inner, cls = '') => `<div class="dev dev-tv ${cls}">${inner}</div>`;
export const kiosk = (inner, cls = '') => `<div class="dev dev-kiosk ${cls}">${inner}</div>`;

// The Servatto tour — one entry per part of the system.
export const TOUR = [
  { key: 'till', title: 'Till', text: 'Fast counter sales, built for the rush. Modifiers, notes and split bills in a tap.', dev: () => tablet(tillScreen()) },
  { key: 'kiosk', title: 'Self-order kiosk', text: 'Customers order and pay themselves. Every option shown with a photo, so they add more.', dev: () => kiosk(kioskScreen()) },
  { key: 'kds', title: 'Kitchen screen', text: 'Every order from every channel in one queue. Timers flag what’s late. One tap marks it ready.', dev: () => tablet(kdsScreen(false)) },
  { key: 'board', title: 'Order screen', text: 'Customers see when their order is ready. Between rushes it doubles as a menu board.', dev: () => tv(boardScreen()) },
  { key: 'dash', title: 'Owner’s dashboard', text: 'Sales, orders and staff for every location, live on your phone.', dev: () => phone(dashScreen()) },
];
