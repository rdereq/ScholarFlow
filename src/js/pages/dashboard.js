/**
 * ============================================================
 * ScholarFlow - Dashboard Page Module
 * ============================================================
 * 
 * 本模块负责渲染仪表盘页面，包括：
 * - 统计卡片（文献总数、完成率、本周阅读、总阅读时长）
 * - 阅读状态分布饼图
 * - 提醒与目标面板
 * - 阅读活动趋势图
 * - 最近活跃文献列表
 * 
 * @module pages/dashboard
 * @version 1.0.0
 */

// ============================================================
// 主渲染函数
// ============================================================

/**
 * 渲染仪表盘页面
 * 生成仪表盘的所有内容，包括统计卡片、图表和最近文献列表
 */
function renderDashboard() {
  const lit = appData.literature;
  const total = lit.length;

  // 按状态统计文献数量
  const byStatus = {};
  Object.keys(STATUS_MAP).forEach(s => byStatus[s] = lit.filter(l => l.status === s).length);

  // 计算完成率
  const completed = byStatus.deep_done + byStatus.skim_done + byStatus.archived;
  const completionRate = total ? Math.round(completed / total * 100) : 0;

  // 计算总阅读时长
  const totalTime = lit.reduce((s, l) => s + l.totalReadTime, 0);

  // 计算本周阅读数据
  const thisWeekSessions = appData.readingSessions.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  const weeklyCount = new Set(thisWeekSessions.map(s => s.litId)).size;
  const weeklyTime = thisWeekSessions.reduce((s, r) => s + r.minutes, 0);

  // 计算逾期和即将到期的文献
  const overdue = lit.filter(l =>
    l.deadline &&
    daysUntil(l.deadline) < 0 &&
    l.status !== 'deep_done' &&
    l.status !== 'archived'
  );
  const upcoming = lit.filter(l =>
    l.deadline &&
    daysUntil(l.deadline) >= 0 &&
    daysUntil(l.deadline) <= 7 &&
    l.status !== 'deep_done' &&
    l.status !== 'archived'
  );

  // 获取页面容器
  const page = document.getElementById('page-dashboard');

  // 生成页面HTML结构
  page.innerHTML = `
    <div class="animate-in">
      <!-- 页面标题 -->
      <div style="margin-bottom:28px;">
        <h1 class="section-title">${escapeHtml(t('dashboard'))}</h1>
        <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">${escapeHtml(t('readingOverview'))} · ${new Date().toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <!-- 统计卡片区域 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
        <!-- 文献总数卡片 -->
        <div class="stat-card animate-in stagger-1">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div><div class="stat-value">${total}</div><div class="stat-label">${escapeHtml(t('totalLiterature'))}</div></div>
            <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" stroke-width="1.8"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </div>
          </div>
        </div>
        
        <!-- 完成率卡片 -->
        <div class="stat-card animate-in stagger-2">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div><div class="stat-value" style="color:#2fb872;">${completionRate}%</div><div class="stat-label">${escapeHtml(t('completionRate'))}</div></div>
            <div style="width:40px;height:40px;border-radius:10px;background:#e8f8ef;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2fb872" stroke-width="1.8"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
        </div>
        
        <!-- 本周已读卡片 -->
        <div class="stat-card animate-in stagger-3">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div><div class="stat-value" style="color:#e09800;">${weeklyCount}</div><div class="stat-label">${escapeHtml(t('thisWeekRead'))}</div></div>
            <div style="width:40px;height:40px;border-radius:10px;background:#fff8e6;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e09800" stroke-width="1.8"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            </div>
          </div>
        </div>
        
        <!-- 总阅读时长卡片 -->
        <div class="stat-card animate-in stagger-4">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div><div class="stat-value">${formatMinutes(totalTime)}</div><div class="stat-label">${escapeHtml(t('totalReadingTime'))}</div></div>
            <div style="width:40px;height:40px;border-radius:10px;background:#fef0f2;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#d4354f" stroke-width="1.8"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表和提醒区域 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
        <!-- 阅读状态分布饼图 -->
        <div class="card animate-in stagger-2">
          <div class="card-header"><span style="font-weight:600;font-size:15px;">${escapeHtml(t('readingStatus'))}</span></div>
          <div class="card-body" style="height:260px;"><div id="chart-status-pie" style="width:100%;height:100%;"></div></div>
        </div>
        
        <!-- 提醒与目标面板 -->
        <div class="card animate-in stagger-3">
          <div class="card-header"><span style="font-weight:600;font-size:15px;">${escapeHtml(t('remindersGoals'))}</span></div>
          <div class="card-body" style="max-height:260px;overflow-y:auto;" id="dashRemindersBody"></div>
        </div>
      </div>

      <!-- 阅读活动趋势图 -->
      <div class="card animate-in stagger-3" style="margin-bottom:28px;">
        <div class="card-header"><span style="font-weight:600;font-size:15px;">${escapeHtml(t('readingActivity30'))}</span></div>
        <div class="card-body" style="height:220px;"><div id="chart-activity" style="width:100%;height:100%;"></div></div>
      </div>

      <!-- 最近活跃文献列表 -->
      <div class="card animate-in stagger-4">
        <div class="card-header">
          <span style="font-weight:600;font-size:15px;">${escapeHtml(t('recentlyActive'))}</span>
          <button class="btn btn-secondary btn-sm" onclick="switchPage('library')">${escapeHtml(t('viewAll'))} →</button>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr><th>${escapeHtml(t('thTitle'))}</th><th>${escapeHtml(t('thStatus'))}</th><th>${escapeHtml(t('thProgress'))}</th><th>${escapeHtml(t('thPriority'))}</th><th>${escapeHtml(t('thLastRead'))}</th></tr></thead>
            <tbody id="dashRecentTbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // 渲染提醒面板内容
  renderRemindersPanel(overdue, upcoming, weeklyCount, weeklyTime);

  // 渲染最近文献列表
  renderRecentLiterature(lit);

  // 延迟渲染图表，确保DOM已就绪
  setTimeout(() => {
    renderStatusPieChart();
    renderActivityChart();
  }, 50);
}

// ============================================================
// 提醒面板渲染
// ============================================================

/**
 * 渲染提醒与目标面板
 * 显示逾期文献、即将到期文献和目标进度
 * @param {Array} overdue 逾期文献列表
 * @param {Array} upcoming 即将到期文献列表
 * @param {number} weeklyCount 本周阅读数量
 * @param {number} weeklyTime 本周阅读时长（分钟）
 */
function renderRemindersPanel(overdue, upcoming, weeklyCount, weeklyTime) {
  const remindersBody = document.getElementById('dashRemindersBody');
  if (!remindersBody) return;

  let remHtml = '';

  // 逾期提醒
  if (overdue.length) {
    remHtml += '<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:#d4354f;margin-bottom:6px;">⚠ ' + escapeHtml(t('overdue')) + ' (' + overdue.length + ')</div>';
    overdue.forEach(l => {
      remHtml += '<div style="padding:6px 0;display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;" data-lit-id="' + escapeAttr(l.id) + '" class="dash-overdue-item"><span style="color:#d4354f;font-weight:600;">' + Math.abs(daysUntil(l.deadline)) + escapeHtml(t('dOverdue')) + '</span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(l.title) + '</span></div>';
    });
    remHtml += '</div>';
  }

  // 即将到期提醒
  if (upcoming.length) {
    remHtml += '<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:#e09800;margin-bottom:6px;">📅 ' + escapeHtml(t('dueSoon')) + ' (' + upcoming.length + ')</div>';
    upcoming.forEach(l => {
      remHtml += '<div style="padding:6px 0;display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;" data-lit-id="' + escapeAttr(l.id) + '" class="dash-upcoming-item"><span style="color:#e09800;font-weight:600;">' + daysUntil(l.deadline) + escapeHtml(t('dLeft')) + '</span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(l.title) + '</span></div>';
    });
    remHtml += '</div>';
  }

  // 周目标进度
  remHtml += `
    <div style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">${escapeHtml(t('weeklyGoal'))}: ${weeklyCount}/<span id="dashWeeklyGoalVal">${appData.goals.weekly}</span> ${escapeHtml(t('papers'))}</span>
        <input type="number" class="input" style="width:56px;padding:2px 6px;font-size:12px;text-align:center;" min="1" value="${appData.goals.weekly}" onchange="appData.goals.weekly=parseInt(this.value)||1;saveData();renderDashboard();" title="${escapeAttr(t('weeklyGoalSetting'))}">
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, weeklyCount / (appData.goals.weekly || 1) * 100)}%;background:var(--accent);"></div></div>
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">${escapeHtml(t('weeklyTime'))}: ${formatMinutes(weeklyTime)}/<span id="dashWeeklyHoursVal">${appData.goals.weeklyHours}</span>h</span>
        <input type="number" class="input" style="width:56px;padding:2px 6px;font-size:12px;text-align:center;" min="1" value="${appData.goals.weeklyHours}" onchange="appData.goals.weeklyHours=parseInt(this.value)||1;saveData();renderDashboard();" title="${escapeAttr(t('weeklyHoursGoal'))}">
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, weeklyTime / (appData.goals.weeklyHours * 60) * 100)}%;background:#2fb872;"></div></div>
    </div>`;

  remindersBody.innerHTML = remHtml;

  // 附加点击事件监听器
  remindersBody.querySelectorAll('.dash-overdue-item, .dash-upcoming-item').forEach(el => {
    el.addEventListener('click', () => switchPage('detail', el.dataset.litId));
  });
}

// ============================================================
// 最近文献列表渲染
// ============================================================

/**
 * 渲染最近活跃的文献列表
 * 显示最近阅读过的5篇文献
 * @param {Array} lit 文献列表
 */
function renderRecentLiterature(lit) {
  const recentTbody = document.getElementById('dashRecentTbody');
  if (!recentTbody) return;

  // 按最后阅读时间排序，取前5篇
  const sorted = lit.filter(l => l.lastReadAt).sort((a, b) =>
    new Date(b.lastReadAt) - new Date(a.lastReadAt)
  ).slice(0, 5);

  recentTbody.innerHTML = sorted.map(l => {
    return '<tr data-lit-id="' + escapeAttr(l.id) + '" class="dash-recent-row">' +
      '<td style="max-width:300px;"><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(l.title) + '</div><div style="font-size:12px;color:var(--text-muted);">' + escapeHtml((l.authors || '').split(',')[0]) + ' et al. &middot; ' + escapeHtml(l.year) + '</div></td>' +
      '<td><span class="badge ' + STATUS_MAP[l.status].badge + '">' + escapeHtml(STATUS_MAP[l.status].label) + '</span></td>' +
      '<td style="width:120px;"><div style="display:flex;align-items:center;gap:8px;"><div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:' + l.progress + '%;background:' + (l.progress >= 100 ? '#2fb872' : l.progress > 50 ? '#e09800' : 'var(--accent)') + ';"></div></div><span style="font-size:12px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);">' + l.progress + '%</span></div></td>' +
      '<td><span class="' + PRIORITY_MAP[l.priority].class + '" style="font-size:13px;">' + escapeHtml(PRIORITY_MAP[l.priority].icon + ' ' + PRIORITY_MAP[l.priority].label) + '</span></td>' +
      '<td style="font-size:13px;color:var(--text-muted);">' + formatDate(l.lastReadAt) + '</td>' +
      '</tr>';
  }).join('');

  // 附加行点击事件
  recentTbody.querySelectorAll('.dash-recent-row').forEach(el => {
    el.addEventListener('click', () => switchPage('detail', el.dataset.litId));
  });
}

// ============================================================
// 图表渲染
// ============================================================

/**
 * 渲染阅读状态分布饼图
 * 使用 ECharts 显示各状态文献的分布情况
 */
function renderStatusPieChart() {
  const el = document.getElementById('chart-status-pie');
  if (!el) return;

  const tc = getThemeColors();

  // 清理旧图表实例
  if (chartInstances.statusPie) {
    chartInstances.statusPie.dispose();
    removeChartResize('statusPie');
  }

  // 创建新图表
  const chart = echarts.init(el);
  chartInstances.statusPie = chart;

  // 准备数据
  const data = Object.entries(STATUS_MAP).map(([k, v]) => ({
    name: v.label,
    value: appData.literature.filter(l => l.status === k).length
  })).filter(d => d.value > 0);

  // 设置图表选项
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    color: ['#78bcff', '#f0b429', '#4ecb8d', '#2fb872', '#e6556f', '#a89d8c'],
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      label: { show: true, fontSize: 12, color: tc.text, formatter: '{b}\n{d}%' },
      labelLine: { lineStyle: { color: tc.border } },
      itemStyle: { borderColor: tc.cardBg, borderWidth: 3, borderRadius: 6 },
      data: data,
      animationType: 'scale',
      animationEasing: 'elasticOut'
    }]
  });

  // 附加大小调整监听器
  attachChartResize(chart, 'statusPie');
}

/**
 * 渲染阅读活动趋势图
 * 使用 ECharts 显示最近30天的阅读时长趋势
 */
function renderActivityChart() {
  const el = document.getElementById('chart-activity');
  if (!el) return;

  const tc = getThemeColors();

  // 清理旧图表实例
  if (chartInstances.activity) {
    chartInstances.activity.dispose();
    removeChartResize('activity');
  }

  // 创建新图表
  const chart = echarts.init(el);
  chartInstances.activity = chart;

  // 准备最近30天的数据
  const days = [];
  const mins = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    days.push(d.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' }));
    const dayTotal = appData.readingSessions.filter(s => s.date === ds).reduce((s, r) => s + r.minutes, 0);
    mins.push(dayTotal);
  }

  // 设置图表选项
  chart.setOption({
    tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br/>${t('chartReading')}: ${p[0].value} ${t('min')}` },
    grid: { left: 40, right: 16, top: 16, bottom: 30 },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: tc.border } },
      axisLabel: { fontSize: 11, color: tc.textMuted, interval: 4 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: tc.grid, type: 'dashed' } },
      axisLabel: { fontSize: 11, color: tc.textMuted, formatter: v => v + 'm' }
    },
    series: [{
      type: 'bar',
      data: mins,
      barWidth: '60%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: tc.accent },
          { offset: 1, color: tc.accent + '40' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: { itemStyle: { color: tc.accent } }
    }]
  });

  // 附加大小调整监听器
  attachChartResize(chart, 'activity');
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderDashboard = renderDashboard;
  window.renderStatusPieChart = renderStatusPieChart;
  window.renderActivityChart = renderActivityChart;
}
