let currentCategory = 'all';

function setNav(btn) {
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setCategory(btn, cat) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCategory = cat;
}

function quickSearch(term) {
  document.getElementById('searchInput').value = term;
  doSearch();
}

function formatPrice(p) {
  return p.toLocaleString('en-IN');
}

async function doSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  document.getElementById('popularRow').style.display = 'none';

  document.getElementById('mainContent').innerHTML = `
    <div style="text-align:center; padding: 80px 20px; color: var(--muted);">
      <div style="font-size: 2.5rem; margin-bottom: 16px;">⚡</div>
      <h3 style="font-family:'Syne',sans-serif; color: var(--text); margin-bottom: 8px;">Searching across platforms...</h3>
      <p>Finding the best prices for "${query}"</p>
    </div>`;

  const encodedQuery = encodeURIComponent(query);

  const urls = {
    Amazon: `https://www.amazon.in/s?k=${encodedQuery}`,
    Flipkart: `https://www.flipkart.com/search?q=${encodedQuery}`,
    Meesho: `https://www.meesho.com/search?q=${encodedQuery}`,
    Myntra: `https://www.myntra.com/${encodedQuery}`,
    Swiggy: `https://www.swiggy.com/search?query=${encodedQuery}`,
    Zomato: `https://www.zomato.com/search?q=${encodedQuery}`,
    Blinkit: `https://blinkit.com/s/?q=${encodedQuery}`,
    BigBasket: `https://www.bigbasket.com/ps/?q=${encodedQuery}`,
    Uber: `https://m.uber.com/looking`,
    Ola: `https://book.olacabs.com/`,
    Rapido: `https://rapido.bike/`
  };

  const prompt = `You are a price comparison engine for India. The user searched for: "${query}". Category: ${currentCategory}.

Return ONLY a JSON object (no markdown, no explanation, no backticks):
{
  "title": "product name",
  "type": "products",
  "results": [
    {
      "platform": "Platform Name",
      "icon": "emoji",
      "type": "platform type",
      "price": 1234,
      "rating": 4.2,
      "tags": ["tag1", "tag2"],
      "color": "#hexcolor"
    }
  ]
}

Rules:
- Give 4-6 realistic Indian platforms like Amazon, Flipkart, Meesho, Myntra, Swiggy, Zomato, Blinkit, BigBasket, Uber, Ola, Rapido
- Prices must be realistic in Indian Rupees
- Return valid JSON only, nothing else
- Do NOT include url field, it will be added automatically`;

  try {
    const response = await fetch("/.netlify/functions/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt })
    });

    const data = await response.json();
    let text = data.choices[0].message.content;
    text = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);

    // Attach URLs in JS, not from AI
    result.results = result.results.map(r => ({
      ...r,
      url: urls[r.platform] || `https://www.google.com/search?q=${encodedQuery}+${encodeURIComponent(r.platform)}`
    }));

    renderResults(result);

  } catch (err) {
    document.getElementById('mainContent').innerHTML = `
      <div style="text-align:center; padding: 80px 20px; color: var(--muted);">
        <div style="font-size: 2.5rem; margin-bottom: 16px;">⚠️</div>
        <h3 style="font-family:'Syne',sans-serif; color: var(--text); margin-bottom: 8px;">Something went wrong</h3>
        <p>Could not fetch prices. Please try again.</p>
        <button class="pop-chip" style="margin-top:20px" onclick="resetSearch()">← Try Again</button>
      </div>`;
  }
}

function renderResults(data) {
  const prices = data.results.map(r => r.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const savings = maxP - minP;
  const currency = '₹';

  const cards = data.results.map((r, i) => {
    const isBest = r.price === minP;
    return `
      <div class="compare-card ${isBest ? 'best-deal' : ''}" style="animation-delay:${i*0.07}s">
        ${isBest ? '<div class="best-badge">🏆 Best Deal</div>' : ''}
        <div class="card-platform">
          <div class="platform-icon" style="background: ${r.color}22; border: 1px solid ${r.color}44">${r.icon}</div>
          <div>
            <div class="platform-name">${r.platform}</div>
            <div class="platform-type">${r.type}</div>
          </div>
        </div>
        <div class="card-price"><span class="currency">${currency}</span>${formatPrice(r.price)}</div>
        <div class="card-meta">
          ${r.tags.map(t => `<span class="meta-tag ${t.includes('min')||t.includes('fast')||t.includes('Prime') ? 'fast' : t.includes('OFF')||t.includes('Deal')||t.includes('Best') ? 'discount' : ''}">${t}</span>`).join('')}
        </div>
        <hr class="card-divider">
        <div class="card-footer">
          <div class="card-rating"><span class="stars">★</span> ${r.rating}</div>
          <a class="book-btn" href="${r.url}" target="_blank" rel="noopener noreferrer">Visit →</a>
        </div>
      </div>`;
  }).join('');

  const bars = data.results.map(r => {
    const pct = Math.round((r.price / maxP) * 100);
    const isBest = r.price === minP;
    return `
      <div class="bar-row">
        <div class="bar-label">${r.platform}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%; background: linear-gradient(90deg, ${isBest ? '#10b981' : r.color+'99'}, ${isBest ? '#34d399' : r.color+'55'});">
            ${isBest ? '🏆 Best' : ''}
          </div>
        </div>
        <div class="bar-value">${currency}${formatPrice(r.price)}</div>
      </div>`;
  }).join('');

  const html = `
    <div style="animation: fadeUp 0.5s ease both;">
      <div class="section-label">
        <h2>${data.title}</h2>
        <span class="pill">${data.results.length} platforms</span>
      </div>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Best Price</div>
          <div class="stat-value green">${currency}${formatPrice(minP)}</div>
          <div class="stat-sub">${data.results.find(r=>r.price===minP).platform}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Max You'd Pay</div>
          <div class="stat-value" style="color:var(--red)">${currency}${formatPrice(maxP)}</div>
          <div class="stat-sub">${data.results.find(r=>r.price===maxP).platform}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">You Can Save</div>
          <div class="stat-value yellow">${currency}${formatPrice(savings)}</div>
          <div class="stat-sub">by choosing wisely</div>
        </div>
      </div>
      <div class="price-summary">
        <h3>Price Breakdown</h3>
        <div class="bar-chart">${bars}</div>
      </div>
      <div class="section-label">
        <h2>All Options</h2>
        <span class="pill">Tap to visit</span>
      </div>
      <div class="compare-grid">${cards}</div>
      <div style="text-align:center; margin-top:40px;">
        <button class="pop-chip" onclick="resetSearch()">← New Search</button>
      </div>
    </div>`;

  document.getElementById('mainContent').innerHTML = html;
}

function resetSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('popularRow').style.display = 'flex';
  document.getElementById('mainContent').innerHTML = `
    <div class="empty-state" id="emptyState">
      <div class="big-icon">🔍</div>
      <h3>What are you looking for?</h3>
      <p>Search any product, ride, or food item above to compare prices across platforms.</p>
    </div>`;
}
