/**
 * ============================================================
 * ScholarFlow - PDF Annotation Module (v1.4.0 - DISABLED)
 * ============================================================
 * 
 * 标注功能已暂时注释，待后期开发。
 * 完整代码保留在 Git 历史中，可通过 git log -- src/js/pdf-annotation.js 找回。
 * 
 * 原功能：
 * - 高亮、下划线、删除线、便签标注（QuadPoints坐标系）
 * - 文本框标注（FreeText）
 * - 手写批注（Ink/画笔）
 * - 标注与 Markdown 笔记双向关联
 */

// ============================================================
// 空桩 (Stubs)
// ============================================================

let annotationState = {
  currentTool: null,
  currentColor: [1, 0.92, 0],
  currentColorHex: '#FFEB3B',
  annotations: [],
  annotationMode: false,
};

let inkDrawingState = {
  isDrawing: false,
  currentPath: [],
  canvas: null,
  ctx: null,
  lineWidth: 4,
};

function initAnnotationSystem() {
  console.log('[Annotation] 标注系统已禁用');
}

function toggleAnnotationMode() {
  console.log('[Annotation] 标注模式已禁用');
}

function setAnnotationTool(tool) {}

function renderAllAnnotations() {}

function deleteAnnotation(annotationId) {}

function initAnnotationToolbarEvents() {}

async function loadAnnotations(litId) { return []; }

async function saveAnnotations(litId, annotations) {}

function showAnnotationPopup(annotation) {}

function getAnnotationTypeLabel(subtype) { return subtype; }

function renderFreeText(annotation, layer) {}
function initInkDrawing(pageNum) {}
function stopInkDrawing() {}
function renderInkAnnotation(annotation, inkLayerDiv) {}
function enterFreeTextEditMode(el, annotation) {}
function handlePdfPageClickForAnnotation(e) {}

function showNoteLinkDialog(annotationId) {}
async function selectAndLinkNote(annotationId, noteId, itemEl) {}
async function unlinkNoteFromAnnotation(annotationId) {}
async function convertAnnotationToNote(annotationId) {}

function toColorHex(color) { return '#FFEB3B'; }
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'ann_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================================
// 初始化（空桩）
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initAnnotationSystem();
  initAnnotationToolbarEvents();
});

// ============================================================
// 导出 (Expose to window)
// ============================================================

if (typeof window !== 'undefined') {
  window.annotationState = annotationState;
  window.inkDrawingState = inkDrawingState;
  window.toggleAnnotationMode = toggleAnnotationMode;
  window.setAnnotationTool = setAnnotationTool;
  window.renderAllAnnotations = renderAllAnnotations;
  window.deleteAnnotation = deleteAnnotation;
  window.initAnnotationToolbarEvents = initAnnotationToolbarEvents;
  window.loadAnnotations = loadAnnotations;
  window.saveAnnotations = saveAnnotations;
  window.showAnnotationPopup = showAnnotationPopup;
  window.getAnnotationTypeLabel = getAnnotationTypeLabel;
  window.renderFreeText = renderFreeText;
  window.initInkDrawing = initInkDrawing;
  window.stopInkDrawing = stopInkDrawing;
  window.renderInkAnnotation = renderInkAnnotation;
  window.enterFreeTextEditMode = enterFreeTextEditMode;
  window.handlePdfPageClickForAnnotation = handlePdfPageClickForAnnotation;
  window.showNoteLinkDialog = showNoteLinkDialog;
  window.selectAndLinkNote = selectAndLinkNote;
  window.unlinkNoteFromAnnotation = unlinkNoteFromAnnotation;
  window.convertAnnotationToNote = convertAnnotationToNote;
  window.toColorHex = toColorHex;
}
