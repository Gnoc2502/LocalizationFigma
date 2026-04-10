figma.showUI(__html__, { width: 360, height: 640 });

// ===== LOAD SETTINGS KHI MỞ PLUGIN =====
(async () => {
  const apiKey = (await figma.clientStorage.getAsync('gemini_api_key')) || '';
  const model = (await figma.clientStorage.getAsync('gemini_model')) || 'gemini-2.5-flash';
  const prompt = (await figma.clientStorage.getAsync('gemini_prompt')) || '';
  figma.ui.postMessage({ type: 'LOAD_SETTINGS', apiKey, model, prompt });
})();

// Cache selected node so it persists when user interacts with plugin UI
let _cachedSelectedNodeId: string | null = null;

function notifySelectionToUI() {
  const sel = figma.currentPage.selection;
  if (sel.length > 0) {
    const node = sel[0];
    const isSupported = node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
    if (isSupported) {
      _cachedSelectedNodeId = node.id;
      figma.ui.postMessage({
        type: 'SELECTION_CHANGED',
        name: node.name,
        nodeType: node.type,
        id: node.id,
      });
    } else {
      figma.ui.postMessage({
        type: 'SELECTION_CHANGED',
        name: node.name,
        nodeType: node.type,
        unsupported: true,
      });
    }
  } else if (_cachedSelectedNodeId) {
    // Selection cleared but we have a cached node — keep showing it
    figma.ui.postMessage({
      type: 'SELECTION_CHANGED',
      cachedName: '(cached)',
      id: _cachedSelectedNodeId,
    });
  }
}

// Listen for selection changes on canvas
figma.on('selectionchange', notifySelectionToUI);

// Initialize cache from current selection
(() => {
  const sel = figma.currentPage.selection;
  if (sel.length > 0) {
    _cachedSelectedNodeId = sel[0].id;
  }
  // Delay to ensure UI is loaded
  setTimeout(notifySelectionToUI, 500);
})();

async function getSelectedFrame(): Promise<FrameNode | null> {
  // Try current selection first, then fall back to cached
  const sel = figma.currentPage.selection;
  const nodeId = sel.length > 0 ? sel[0].id : _cachedSelectedNodeId;
  if (!nodeId) return null;

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return null;

  // Support Frame, Section, Component, ComponentSet
  if (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    return node as FrameNode;
  }
  return null;
}

figma.ui.onmessage = async (msg) => {
  // ===== LƯU SETTINGS =====
  if (msg.type === 'SAVE_SETTINGS') {
    await figma.clientStorage.setAsync('gemini_api_key', msg.apiKey || '');
    await figma.clientStorage.setAsync('gemini_model', msg.model || 'gemini-2.5-flash');
    await figma.clientStorage.setAsync('gemini_prompt', msg.prompt || '');
    return;
  }

  if (msg.type === 'EXTRACT_TEXT') {
    const selectedNode = await getSelectedFrame();
    if (!selectedNode) {
      figma.notify('⚠️ Vui lòng chọn 1 màn hình (Frame/Section) để dịch!');
      figma.ui.postMessage({ type: 'TRANSLATE_ERROR', error: 'Chưa chọn Frame nào!' });
      return;
    }

    const textNodes = selectedNode.findAllWithCriteria({ types: ['TEXT'] });

    const textsToTranslate = textNodes
      .map((node: TextNode) => node.characters.trim())
      .filter((t: string) => t.length > 0);

    figma.ui.postMessage({ type: 'START_TRANSLATE', texts: textsToTranslate, langCode: msg.langCode, langName: msg.langName });
  }

  if (msg.type === 'APPLY_TRANSLATION') {
    // Use explicit sourceFrameId if provided (batch mode), otherwise fall back to selection
    let originalFrame: FrameNode | null = null;
    if (msg.sourceFrameId) {
      const node = await figma.getNodeByIdAsync(msg.sourceFrameId);
      if (node && (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')) {
        originalFrame = node as FrameNode;
      }
    } else {
      originalFrame = await getSelectedFrame();
    }
    if (!originalFrame) {
      figma.ui.postMessage({ type: 'TRANSLATE_ERROR', error: 'Frame không còn tồn tại!' });
      return;
    }
    const clonedFrame = originalFrame.clone();
    if (msg.x !== undefined && msg.y !== undefined) {
      clonedFrame.x = msg.x;
      clonedFrame.y = msg.y;
    } else {
      const gap = msg.gap !== undefined ? msg.gap : 200;
      clonedFrame.y = originalFrame.y + originalFrame.height + gap;
    }

    // Đặt tên theo ngôn ngữ thực tế
    const langLabel = msg.langName || msg.langCode || 'Translated';
    clonedFrame.name = originalFrame.name + ` (${langLabel})`;

    // Hàm normalize text để so sánh chính xác hơn
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

    // Tạo bản dict đã normalize key để matching dễ hơn
    const normalizedDict: Record<string, string> = {};
    for (const key in msg.translatedDict) {
      normalizedDict[normalize(key)] = msg.translatedDict[key];
    }
    console.log('📖 Dict sau khi normalize:', JSON.stringify(normalizedDict));

    let translatedCount = 0;
    let skippedCount = 0;

    // Quét text trên bản sao
    const clonedTextNodes = clonedFrame.findAllWithCriteria({ types: ['TEXT'] });

    for (const node of clonedTextNodes) {
      const originalText = normalize(node.characters);
      const translated = normalizedDict[originalText];

      if (translated) {
        if (node.fontName !== figma.mixed) {
          await figma.loadFontAsync(node.fontName as FontName);
          node.characters = translated;
          translatedCount++;
        } else {
          // Mixed font: load từng ký tự font rồi replace
          const len = node.characters.length;
          for (let i = 0; i < len; i++) {
            const font = node.getRangeFontName(i, i + 1) as FontName;
            await figma.loadFontAsync(font);
          }
          node.characters = translated;
          translatedCount++;
        }
      } else {
        console.log('⏭️ Không tìm thấy bản dịch cho:', originalText);
        skippedCount++;
      }
    }

    // In batch mode (sourceFrameId provided), don't change selection to avoid
    // corrupting the cached selection for subsequent translations
    if (!msg.sourceFrameId) {
      figma.currentPage.selection = [clonedFrame];
      figma.viewport.scrollAndZoomIntoView([clonedFrame]);
    }
    figma.notify(`🎉 Dịch xong! ${translatedCount} text đã dịch, ${skippedCount} text bỏ qua.`);

    // Gửi message về UI báo hoàn tất
    figma.ui.postMessage({
      type: 'TRANSLATION_DONE',
      translatedCount,
      skippedCount,
      langName: langLabel,
      cloneId: clonedFrame.id,
    });
  }

  if (msg.type === 'DETECT_OVERFLOW') {
    const frameId = msg.frameId as string;
    const node = await figma.getNodeByIdAsync(frameId);
    if (!node || (node.type !== 'FRAME' && node.type !== 'SECTION' && node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET')) {
      figma.ui.postMessage({ type: 'OVERFLOW_RESULT', frameId, overflows: [] });
      return;
    }

    const frame = node as FrameNode;
    const textNodes = frame.findAllWithCriteria({ types: ['TEXT'] });
    const overflows: Array<{
      nodeId: string;
      nodeName: string;
      parentId: string;
      parentName: string;
      type: 'clipped' | 'expanded';
      text: string;
      charCount: number;
      actualWidth: number;
      actualHeight: number;
      containerWidth: number;
      containerHeight: number;
    }> = [];

    for (const textNode of textNodes) {
      const parent = textNode.parent;
      if (!parent || !('absoluteBoundingBox' in parent)) continue;

      const parentBounds = (parent as FrameNode).absoluteBoundingBox;
      if (!parentBounds) continue;

      // Strategy 1: Check if auto-resize text expands beyond parent
      const textBounds = textNode.absoluteRenderBounds;
      if (textBounds && parentBounds) {
        const exceedsWidth = textBounds.x + textBounds.width > parentBounds.x + parentBounds.width + 1;
        const exceedsHeight = textBounds.y + textBounds.height > parentBounds.y + parentBounds.height + 1;

        if (exceedsWidth || exceedsHeight) {
          overflows.push({
            nodeId: textNode.id,
            nodeName: textNode.name,
            parentId: (parent as SceneNode).id,
            parentName: parent.name,
            type: 'expanded',
            text: textNode.characters.substring(0, 50),
            charCount: textNode.characters.length,
            actualWidth: textBounds.width,
            actualHeight: textBounds.height,
            containerWidth: parentBounds.width,
            containerHeight: parentBounds.height,
          });
          continue;
        }
      }

      // Strategy 2: Check clipped text (textAutoResize = "NONE")
      if (textNode.textAutoResize === 'NONE') {
        const origWidth = textNode.width;
        const origHeight = textNode.height;
        const origResize = textNode.textAutoResize;

        // Load font before measuring
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName as FontName);
        } else {
          const len = textNode.characters.length;
          for (let i = 0; i < len; i++) {
            const font = textNode.getRangeFontName(i, i + 1) as FontName;
            await figma.loadFontAsync(font);
          }
        }

        textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        const naturalWidth = textNode.width;
        const naturalHeight = textNode.height;

        // Restore
        textNode.textAutoResize = origResize;
        textNode.resize(origWidth, origHeight);

        if (naturalWidth > origWidth + 1 || naturalHeight > origHeight + 1) {
          overflows.push({
            nodeId: textNode.id,
            nodeName: textNode.name,
            parentId: (parent as SceneNode).id,
            parentName: parent.name,
            type: 'clipped',
            text: textNode.characters.substring(0, 50),
            charCount: textNode.characters.length,
            actualWidth: naturalWidth,
            actualHeight: naturalHeight,
            containerWidth: origWidth,
            containerHeight: origHeight,
          });
        }
      }
    }

    // Remove old overflow markers from previous detection
    const allChildren = frame.findAll(n => n.type === 'RECTANGLE' && n.name.startsWith('⚠️ Overflow:'));
    for (const old of allChildren) {
      old.remove();
    }

    if (overflows.length > 0) {
      figma.notify(`⚠️ ${overflows.length} text bị tràn (overflow) detected!`, { timeout: 5000 });

      // Create visual overflow markers on each overflow node
      for (const o of overflows) {
        const overflowNode = await figma.getNodeByIdAsync(o.nodeId);
        if (!overflowNode || !('absoluteBoundingBox' in overflowNode)) continue;
        const bounds = (overflowNode as SceneNode & { absoluteBoundingBox: Rect }).absoluteBoundingBox;
        if (!bounds) continue;

        // Create a red outline marker around the overflow text
        const marker = figma.createRectangle();
        marker.name = `⚠️ Overflow: ${o.nodeName}`;
        marker.x = bounds.x - 2;
        marker.y = bounds.y - 2;
        marker.resize(bounds.width + 4, bounds.height + 4);
        marker.fills = [];
        marker.strokes = [{ type: 'SOLID', color: { r: 1, g: 0.2, b: 0.2 } }];
        marker.strokeWeight = 2;
        marker.dashPattern = [4, 4];
        marker.opacity = 0.8;

        // Place marker inside the cloned frame
        const parentFrame = await figma.getNodeByIdAsync(frameId);
        if (parentFrame && 'appendChild' in parentFrame) {
          (parentFrame as FrameNode).appendChild(marker);
          // Position relative to parent
          marker.x = bounds.x - (parentFrame as FrameNode).absoluteTransform[0][2] - 2;
          marker.y = bounds.y - (parentFrame as FrameNode).absoluteTransform[1][2] - 2;
        }
      }
    }
    figma.ui.postMessage({ type: 'OVERFLOW_RESULT', frameId, overflows });
  }

  if (msg.type === 'NAVIGATE_NODE') {
    const nodeId = msg.nodeId as string;
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
      const sceneNode = node as SceneNode;
      figma.currentPage.selection = [sceneNode];
      figma.viewport.scrollAndZoomIntoView([sceneNode]);
      figma.ui.postMessage({ type: 'NODE_NAVIGATED', nodeId, name: node.name });
    } else {
      figma.ui.postMessage({ type: 'NODE_NAVIGATED', nodeId, error: 'Node not found' });
    }
  }

  if (msg.type === 'DELETE_FRAME') {
    const nodeId = msg.frameId as string;
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
      (node as SceneNode).remove();
      figma.ui.postMessage({ type: 'FRAME_DELETED', frameId: nodeId });
    }
  }

  if (msg.type === 'GET_SOURCE_INFO') {
    const node = await getSelectedFrame();
    if (!node) {
      figma.ui.postMessage({ type: 'SOURCE_INFO', error: 'No frame selected' });
      return;
    }
    figma.ui.postMessage({
      type: 'SOURCE_INFO',
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      id: node.id,
      name: node.name,
    });
  }

  if (msg.type === 'APPLY_OVERFLOW_FIX') {
    const translations = msg.translations as Record<string, string>;
    let fixed = 0;

    for (const nodeId in translations) {
      const newText = translations[nodeId];
      const node = await figma.getNodeByIdAsync(nodeId);
      if (node && node.type === 'TEXT') {
        const textNode = node as TextNode;
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName as FontName);
        } else {
          const len = textNode.characters.length;
          for (let i = 0; i < len; i++) {
            const font = textNode.getRangeFontName(i, i + 1) as FontName;
            await figma.loadFontAsync(font);
          }
        }
        textNode.characters = newText;
        fixed++;
      }
    }

    figma.ui.postMessage({ type: 'OVERFLOW_FIX_DONE', fixed });
  }
};