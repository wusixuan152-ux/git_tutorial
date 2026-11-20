// chart.js - 차트 및 요일별 평균 매출 표 렌더링 스크립트

document.addEventListener('DOMContentLoaded', function () {
  if (!window.CAFE_DATA) {
    console.error('CAFE_DATA not found. Make sure data.js is loaded.');
    return;
  }

  const data = window.CAFE_DATA;

  // 1. 요약 지표 (KPI) 렌더링
  renderKPICards(data);

  // 2. 일별 매출 꺾은선 차트 렌더링
  renderDailyRevenueChart(data);

  // 3. 메뉴별 판매량 막대 차트 렌더링
  renderMenuSalesChart(data);

  // 4. 요일별 평균 매출 표 렌더링
  renderDayOfWeekTable(data);
});

// 화폐 포맷터
function formatKRW(val) {
  return '₩' + Math.round(val).toLocaleString('ko-KR');
}

// 1. KPI 카드
function renderKPICards(data) {
  const totalRevEl = document.getElementById('kpi-total-revenue');
  const totalQtyEl = document.getElementById('kpi-total-qty');
  const avgRevEl = document.getElementById('kpi-avg-revenue');
  const topMenuEl = document.getElementById('kpi-top-menu');

  if (totalRevEl) totalRevEl.textContent = formatKRW(data.grandTotalRevenue);
  if (totalQtyEl) totalQtyEl.textContent = data.grandTotalQuantity.toLocaleString('ko-KR') + ' 잔';
  if (avgRevEl) avgRevEl.textContent = formatKRW(data.averageDailyRevenue);

  // 최고 인기 메뉴 계산
  const menuTotals = {};
  data.dailyData.forEach(day => {
    day.sales.forEach(item => {
      if (!menuTotals[item.menuName]) {
        menuTotals[item.menuName] = 0;
      }
      menuTotals[item.menuName] += item.quantity;
    });
  });

  let topMenuName = '';
  let maxQty = -1;
  for (const [name, qty] of Object.entries(menuTotals)) {
    if (qty > maxQty) {
      maxQty = qty;
      topMenuName = name;
    }
  }

  if (topMenuEl) {
    // 메뉴 이름 축약 표시 (괄호 앞부분)
    const displayName = topMenuName.split(' ')[0] || topMenuName;
    topMenuEl.textContent = `${displayName} (${maxQty.toLocaleString('ko-KR')}잔)`;
  }
}

// 2. ① 일별 매출 꺾은선 차트 (Line Chart)
function renderDailyRevenueChart(data) {
  const ctx = document.getElementById('dailyRevenueChart');
  if (!ctx) return;

  const labels = data.dailyData.map(d => `${d.date.slice(5)} (${d.dayOfWeekShort})`);
  const revenues = data.dailyData.map(d => d.totalRevenue);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '일별 매출액',
        data: revenues,
        borderColor: '#2d6a4f',
        backgroundColor: 'rgba(45, 106, 79, 0.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#2d6a4f',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#1b4332'
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 12, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(27, 67, 50, 0.92)',
          padding: 10,
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          callbacks: {
            label: function (context) {
              return '매출: ' + formatKRW(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.06)' },
          ticks: {
            font: { size: 11 },
            callback: function (val) {
              return (val / 10000) + '만';
            }
          }
        }
      }
    }
  });
}

// 3. ② 메뉴별 판매량 막대 차트 (Bar Chart)
function renderMenuSalesChart(data) {
  const ctx = document.getElementById('menuSalesChart');
  if (!ctx) return;

  // 메뉴별 집계
  const menuStats = {};
  data.menus.forEach(m => {
    menuStats[m.id] = {
      name: m.name,
      price: m.price,
      quantity: 0,
      revenue: 0
    };
  });

  data.dailyData.forEach(day => {
    day.sales.forEach(s => {
      if (menuStats[s.menuId]) {
        menuStats[s.menuId].quantity += s.quantity;
        menuStats[s.menuId].revenue += s.revenue;
      }
    });
  });

  const menuList = Object.values(menuStats);
  const labels = menuList.map(m => m.name.split(' (')[0]);
  const quantities = menuList.map(m => m.quantity);
  const revenues = menuList.map(m => m.revenue);

  const colors = [
    '#40916c',
    '#52b788',
    '#74c69d',
    '#95d5b2',
    '#b7e4c7'
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '총 판매량 (잔)',
        data: quantities,
        backgroundColor: colors,
        borderColor: '#2d6a4f',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(27, 67, 50, 0.92)',
          padding: 10,
          callbacks: {
            title: function (items) {
              const idx = items[0].dataIndex;
              return menuList[idx].name;
            },
            label: function (context) {
              const idx = context.dataIndex;
              const q = quantities[idx].toLocaleString('ko-KR') + ' 잔';
              const r = formatKRW(revenues[idx]);
              return [`판매량: ${q}`, `총 매출: ${r}`];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: '500' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.06)' },
          ticks: {
            font: { size: 11 },
            callback: function (val) {
              return val + '잔';
            }
          }
        }
      }
    }
  });
}

// 4. ③ 요일별 평균 매출 표 (Table)
function renderDayOfWeekTable(data) {
  const tbody = document.getElementById('dow-table-body');
  if (!tbody) return;

  // 요일 순서 (월 ~ 일)
  const daysOrder = [
    { name: '월요일', short: '월', isWeekend: false },
    { name: '화요일', short: '화', isWeekend: false },
    { name: '수요일', short: '수', isWeekend: false },
    { name: '목요일', short: '목', isWeekend: false },
    { name: '금요일', short: '금', isWeekend: false },
    { name: '토요일', short: '토', isWeekend: true },
    { name: '일요일', short: '일', isWeekend: true }
  ];

  // 집계
  const stats = {};
  daysOrder.forEach(d => {
    stats[d.name] = { count: 0, totalRev: 0, totalQty: 0, isWeekend: d.isWeekend };
  });

  data.dailyData.forEach(d => {
    if (stats[d.dayOfWeek]) {
      stats[d.dayOfWeek].count += 1;
      stats[d.dayOfWeek].totalRev += d.totalRevenue;
      stats[d.dayOfWeek].totalQty += d.totalQuantity;
    }
  });

  let grandRev = data.grandTotalRevenue || 1;
  let maxAvgRev = -1;
  daysOrder.forEach(d => {
    const s = stats[d.name];
    const avg = s.count > 0 ? s.totalRev / s.count : 0;
    if (avg > maxAvgRev) maxAvgRev = avg;
  });

  tbody.innerHTML = '';

  daysOrder.forEach(d => {
    const s = stats[d.name];
    const avgRev = s.count > 0 ? Math.round(s.totalRev / s.count) : 0;
    const avgQty = s.count > 0 ? Math.round(s.totalQty / s.count) : 0;
    const share = ((s.totalRev / grandRev) * 100).toFixed(1);
    const isPeak = avgRev === Math.round(maxAvgRev);

    const tr = document.createElement('tr');
    if (d.isWeekend) {
      tr.classList.add('weekend-row');
    }

    tr.innerHTML = `
      <td>
        <span class="day-badge ${d.isWeekend ? 'weekend' : 'weekday'}">${d.name}</span>
        ${isPeak ? '<span class="peak-badge">최고매출</span>' : ''}
      </td>
      <td class="text-center">${s.count}일</td>
      <td class="text-right font-medium">${formatKRW(s.totalRev)}</td>
      <td class="text-right font-bold text-accent">${formatKRW(avgRev)}</td>
      <td class="text-right">${avgQty.toLocaleString('ko-KR')} 잔</td>
      <td class="text-right">
        <div class="share-container">
          <span>${share}%</span>
          <div class="share-bar-bg">
            <div class="share-bar-fill" style="width: ${share * 3.5}px;"></div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
