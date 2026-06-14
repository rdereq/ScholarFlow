/**
 * ============================================================
 * ScholarFlow - Statistics Page Module
 * ============================================================
 * 
 * 本模块负责渲染统计页面，包括：
 * - 月度阅读趋势图
 * - 研究领域分布图
 * - 阅读热力图（90天）
 * - 完成漏斗图
 * - 连续打卡与里程碑统计
 * 
 * @module pages/stats
 * @version 1.0.0
 */

// ============================================================
// 主渲染函数
// ============================================================

/**
 * 渲染统计页面
 * 显示各种统计数据和可视化图表
 */
function renderStatsPage() {
  const lit = appData.literature;
  const sessions = appData.readingSessions;
  const tc = getThemeColors();

  const page = document.getElementById('page-stats');

  // 生成页面HTML结构
  page.innerHTML = `
    <div class="animate-in">
      <h1 class="section-title" style="margin-bottom:20px;">${escapeHtml(t('statsTitle'))}</h1>

      <!-- 月度趋势和研究领域分布 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('monthlyTrend'))}</span></div>
          <div class="card-body" style="height:280px;"><div id="chart-monthly" style="width:100%;height:100%;"></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('researchFields'))}</span></div>
          <div class="card-body" style="height:280px;"><div id="chart-fields" style="width:100%;height:100%;"></div></div>
        </div>
      </div>

      <!-- 阅读热力图和完成漏斗 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('readingHeatmap'))}</span></div>
          <div class="card-body"><div id="heatmapContainer" style="display:flex;flex-wrap:wrap;gap:3px;"></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('completionFunnel'))}</span></div>
          <div class="card-body" style="height:280px;"><div id="chart-funnel" style="width:100%;height:100%;"></div></div>
        </div>
      </div>

      <!-- 连续打卡与里程碑 -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('streaksMilestones'))}</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;" id="statsMilestones"></div>
        </div>
      </div>
    </div>
  `;

  // 渲染里程碑统计
  const msContainer = document.getElementById('statsMilestones');
  if (msContainer) msContainer.innerHTML = renderMilestonesSafe();

  // 延迟渲染图表，确保DOM已就绪
  setTimeout(() => {
    renderMonthlyChart();
    renderFieldsChart();
    renderHeatmap();
    renderFunnelChart();
  }, 50);
}

// ============================================================
// 里程碑渲染
// ============================================================

/**
 * 渲染里程碑统计卡片
 * 计算并显示连续阅读天数、已完成文献数、总阅读时长和笔记数量
 * @returns {string} 里程碑卡片的HTML字符串
 */
function renderMilestonesSafe() {
  // 计算已完成文献数
  const completed = appData.literature.filter(l => l.status === 'deep_done' || l.status === 'skim_done').length;

  // 计算总阅读时长（小时）
  const totalHours = Math.round(appData.literature.reduce((s, l) => s + l.totalReadTime, 0) / 60);

  // 计算连续阅读天数
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (appData.readingSessions.some(s => s.date === ds)) {
      streak++;
    } else {
      break;
    }
  }

  // 生成里程碑卡片HTML
  return '<div class="stat-card"><div class="stat-value" style="color:#2fb872;">' + streak + '</div><div class="stat-label">' + escapeHtml(t('dayStreak') + ' \u{1F525}') + '</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + completed + '</div><div class="stat-label">' + escapeHtml(t('papersCompleted')) + '</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + totalHours + 'h</div><div class="stat-label">' + escapeHtml(t('totalHoursRead')) + '</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + appData.notes.length + '</div><div class="stat-label">' + escapeHtml(t('notesCreated')) + '</div></div>';
}

// ============================================================
// 图表渲染
// ============================================================

/**
 * 渲染月度趋势图表
 * 显示最近6个月的阅读会话数和阅读时长
 */
function renderMonthlyChart() {
  const el = document.getElementById('chart-monthly');
  if (!el) return;

  const tc = getThemeColors();

  // 清理旧图表实例
  if (chartInstances.monthly) {
    chartInstances.monthly.dispose();
    removeChartResize('monthly');
  }

  // 创建新图表
  const chart = echarts.init(el);
  chartInstances.monthly = chart;

  // 准备最近6个月的数据
  const months = [];
  const counts = [];
  const times = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' });
    const ym = d.toISOString().slice(0, 7);
    months.push(label);
    counts.push(appData.readingSessions.filter(s => s.date.startsWith(ym)).length);
    times.push(Math.round(appData.readingSessions.filter(s => s.date.startsWith(ym)).reduce((s, r) => s + r.minutes, 0) / 60));
  }

  // 设置图表选项
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: [t('sessions'), t('hours')], textStyle: { color: tc.textMuted, fontSize: 12 } },
    grid: { left: 40, right: 16, top: 36, bottom: 30 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: tc.border } },
      axisLabel: { color: tc.textMuted, fontSize: 11 }
    },
    yAxis: [
      {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: tc.grid, type: 'dashed' } },
        axisLabel: { color: tc.textMuted, fontSize: 11 }
      },
      {
        type: 'value',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: tc.textMuted, fontSize: 11, formatter: v => v + 'h' }
      }
    ],
    series: [
      {
        name: t('sessions'),
        type: 'bar',
        data: counts,
        barWidth: '40%',
        itemStyle: { color: tc.accent, borderRadius: [4, 4, 0, 0] }
      },
      {
        name: t('hours'),
        type: 'line',
        yAxisIndex: 1,
        data: times,
        smooth: true,
        lineStyle: { color: '#2fb872', width: 2 },
        itemStyle: { color: '#2fb872' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#2fb87240' },
            { offset: 1, color: '#2fb87205' }
          ])
        }
      }
    ]
  });

  // 附加大小调整监听器
  attachChartResize(chart, 'monthly');
}

/**
 * 渲染研究领域分布图
 * 使用玫瑰图显示标签的分布情况
 */
function renderFieldsChart() {
  const el = document.getElementById('chart-fields');
  if (!el) return;

  const tc = getThemeColors();

  // 清理旧图表实例
  if (chartInstances.fields) {
    chartInstances.fields.dispose();
    removeChartResize('fields');
  }

  // 统计标签数量（同时聚合 tags 和 keywords，因为 DOI 批量导入将主题/概念字段存于 keywords）
  const tagCounts = {};
  const seen = new Set(); // 防止单篇文献内同一词被重复计数
  appData.literature.forEach(l => {
    seen.clear();
    // 1. tags（用户手动分配的标签）
    (l.tags || []).forEach(t => {
      const name = String(t || '').trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      tagCounts[name] = (tagCounts[name] || 0) + 1;
    });
    // 2. keywords（DOI 导入时填充的主题 / 学科 / 概念）
    (l.keywords || []).forEach(k => {
      const name = String(k || '').trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      tagCounts[name] = (tagCounts[name] || 0) + 1;
    });
  });

  // 准备数据，取前8个
  const data = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // 没有数据时显示提示
  if (data.length === 0) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">' + escapeHtml(t('noTagData')) + '</div>';
    return;
  }

  el.innerHTML = '';

  // 创建新图表
  const chart = echarts.init(el);
  chartInstances.fields = chart;

  // 设置图表选项
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    color: ['#0077e6', '#2fb872', '#e09800', '#d4354f', '#7c3aed', '#06b6d4', '#f97316', '#8b5cf6'],
    series: [{
      type: 'pie',
      radius: ['0%', '70%'],
      center: ['50%', '50%'],
      roseType: 'area',
      label: { show: true, fontSize: 11, color: tc.text },
      itemStyle: { borderColor: tc.cardBg, borderWidth: 2, borderRadius: 4 },
      data: data
    }]
  });

  // 附加大小调整监听器
  attachChartResize(chart, 'fields');
}

/**
 * 渲染阅读热力图
 * 显示最近90天的阅读活动情况
 */
function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  const now = new Date();
  let html = '';

  // 生成90天的热力图单元格
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];

    // 计算当天的阅读时长
    const dayMins = appData.readingSessions
      .filter(s => s.date === ds)
      .reduce((s, r) => s + r.minutes, 0);

    // 根据阅读时长确定颜色深度
    let bg = 'var(--border-light)';
    if (dayMins > 0 && dayMins < 30) bg = '#78bcff40';
    else if (dayMins >= 30 && dayMins < 60) bg = '#78bcff80';
    else if (dayMins >= 60 && dayMins < 120) bg = '#0077e6a0';
    else if (dayMins >= 120) bg = '#0077e6';

    // 生成带提示的单元格
    html += '<div class="heatmap-cell tooltip-wrap" style="background:' + bg + ';"><div class="tooltip">' + escapeHtml(ds) + ': ' + dayMins + escapeHtml('min') + '</div></div>';
  }

  container.innerHTML = html;
}

/**
 * 渲染完成漏斗图
 * 显示从总数到精读的完成漏斗
 */
function renderFunnelChart() {
  const el = document.getElementById('chart-funnel');
  if (!el) return;

  const tc = getThemeColors();

  // 清理旧图表实例
  if (chartInstances.funnel) {
    chartInstances.funnel.dispose();
    removeChartResize('funnel');
  }

  const lit = appData.literature;

  // 没有数据时显示提示
  if (lit.length === 0) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">' + escapeHtml(t('noLitData')) + '</div>';
    return;
  }

  el.innerHTML = '';

  // 创建新图表
  const chart = echarts.init(el);
  chartInstances.funnel = chart;

  // 准备漏斗数据
  const totalCount = lit.length;
  const startedCount = lit.filter(l => l.status !== 'unread').length;
  const completedCount = lit.filter(l => l.status === 'skim_done' || l.status === 'deep_done' || l.status === 'archived').length;
  const deepReadCount = lit.filter(l => l.status === 'deep_done').length;

  // 设置图表选项
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    color: ['#78bcff', '#f0b429', '#4ecb8d', '#2fb872', '#e6556f', '#a89d8c'],
    series: [{
      type: 'funnel',
      left: '10%',
      width: '80%',
      min: 0,
      max: lit.length || 1,
      sort: 'descending',
      label: { show: true, position: 'inside', fontSize: 12, color: '#fff' },
      itemStyle: { borderWidth: 0 },
      data: [
        { value: totalCount, name: t('total') + ': ' + totalCount },
        { value: startedCount, name: t('started') + ': ' + startedCount },
        { value: completedCount, name: t('completed') + ': ' + completedCount },
        { value: deepReadCount, name: t('deepRead') + ': ' + deepReadCount }
      ]
    }]
  });

  // 附加大小调整监听器
  attachChartResize(chart, 'funnel');
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderStatsPage = renderStatsPage;
  window.renderMilestonesSafe = renderMilestonesSafe;
  window.renderMonthlyChart = renderMonthlyChart;
  window.renderFieldsChart = renderFieldsChart;
  window.renderHeatmap = renderHeatmap;
  window.renderFunnelChart = renderFunnelChart;
}
