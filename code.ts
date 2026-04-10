figma.showUI(__html__, { width: 320, height: 580, themeColors: true });

// ===== LOAD SETTINGS KHI MỞ PLUGIN =====
(async () => {
  const apiKey = (await figma.clientStorage.getAsync('gemini_api_key')) || '';
  const model = (await figma.clientStorage.getAsync('gemini_model')) || 'gemini-2.5-flash';
  const prompt = (await figma.clientStorage.getAsync('gemini_prompt')) || '';
  figma.ui.postMessage({ type: 'LOAD_SETTINGS', apiKey, model, prompt });
})();

// ===== BATCH FONT LOADING =====
async function batchLoadFonts(textNodes: TextNode[]): Promise<void> {
  const fontsToLoad = new Set<string>();
  for (const node of textNodes) {
    if (node.fontName === figma.mixed) {
      const len = node.characters.length;
      for (let i = 0; i < len; i++) {
        fontsToLoad.add(JSON.stringify(node.getRangeFontName(i, i + 1)));
      }
    } else {
      fontsToLoad.add(JSON.stringify(node.fontName));
    }
  }
  await Promise.all(
    Array.from(fontsToLoad).map(f =>
      figma.loadFontAsync(JSON.parse(f) as FontName)
    )
  );
}

// ===== MESSAGE HANDLER =====
figma.ui.onmessage = async (msg) => {
  // ===== LƯU SETTINGS =====
  if (msg.type === 'SAVE_SETTINGS') {
    await figma.clientStorage.setAsync('gemini_api_key', msg.apiKey || '');
    await figma.clientStorage.setAsync('gemini_model', msg.model || 'gemini-2.5-flash');
    await figma.clientStorage.setAsync('gemini_prompt', msg.prompt || '');
    return;
  }

  // ===== CLICK TO NAVIGATE =====
  if (msg.type === 'SELECT_NODE') {
    const node = await figma.getNodeByIdAsync(msg.nodeId);
    if (node && 'type' in node) {
      const sceneNode = node as SceneNode;
      figma.currentPage.selection = [sceneNode];
      figma.viewport.scrollAndZoomIntoView([sceneNode]);
      figma.notify(`📍 Đã chọn: ${sceneNode.name}`);
    } else {
      figma.notify('⚠️ Không tìm thấy node', { error: true });
    }
    return;
  }

  // ===== TRÍCH XUẤT TEXT =====
  if (msg.type === 'EXTRACT_TEXT') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify('⚠️ Vui lòng chọn 1 màn hình (Frame) để dịch!');
      figma.ui.postMessage({ type: 'TRANSLATE_ERROR', error: 'Chưa chọn Frame nào!' });
      return;
    }

    const selectedNode = selection[0] as FrameNode;
    const textNodes = selectedNode.findAllWithCriteria({ types: ['TEXT'] });

    const textsToTranslate = textNodes
      .map((node: TextNode) => node.characters.trim())
      .filter((t: string) => t.length > 0);

    figma.ui.postMessage({
      type: 'START_TRANSLATE',
      texts: textsToTranslate,
      langCode: msg.langCode,
      langName: msg.langName
    });
  }

  // ===== APPLY TRANSLATION (text đã kiểm tra xong từ UI) =====
  if (msg.type === 'APPLY_TRANSLATION') {
    const originalFrame = figma.currentPage.selection[0] as FrameNode;
    const clonedFrame = originalFrame.clone();
    clonedFrame.y = originalFrame.y + originalFrame.height + 100;

    const langLabel = msg.langName || msg.langCode || 'Translated';
    clonedFrame.name = originalFrame.name + ` (${langLabel})`;

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

    const normalizedDict: Record<string, string> = {};
    for (const key in msg.translatedDict) {
      normalizedDict[normalize(key)] = msg.translatedDict[key];
    }

    const clonedTextNodes = clonedFrame.findAllWithCriteria({ types: ['TEXT'] });
    await batchLoadFonts(clonedTextNodes);

    let translatedCount = 0;
    let skippedCount = 0;

    for (const node of clonedTextNodes) {
      const originalText = normalize(node.characters);
      const translated = normalizedDict[originalText];

      if (!translated) {
        skippedCount++;
        continue;
      }

      node.characters = translated;
      translatedCount++;
    }

    figma.currentPage.selection = [clonedFrame];
    figma.viewport.scrollAndZoomIntoView([clonedFrame]);

    figma.notify(`🎉 Dịch xong! ${translatedCount} text, ${skippedCount} bỏ qua.`);
    figma.ui.postMessage({
      type: 'TRANSLATION_DONE',
      translatedCount,
      skippedCount,
      langName: langLabel
    });
  }
};