import { normalize } from './src/utils';

figma.showUI(__html__, { width: 320, height: 520 });

// ===== LOAD SETTINGS KHI MỞ PLUGIN =====
(async () => {
  const apiKey = (await figma.clientStorage.getAsync('gemini_api_key')) || '';
  const model = (await figma.clientStorage.getAsync('gemini_model')) || 'gemini-2.5-flash';
  const prompt = (await figma.clientStorage.getAsync('gemini_prompt')) || '';
  figma.ui.postMessage({ type: 'LOAD_SETTINGS', apiKey, model, prompt });
})();

figma.ui.onmessage = async (msg) => {
  // ===== LƯU SETTINGS =====
  if (msg.type === 'SAVE_SETTINGS') {
    await figma.clientStorage.setAsync('gemini_api_key', msg.apiKey || '');
    await figma.clientStorage.setAsync('gemini_model', msg.model || 'gemini-2.5-flash');
    await figma.clientStorage.setAsync('gemini_prompt', msg.prompt || '');
    return;
  }

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

    // Truyền langCode + langName từ UI xuống
    figma.ui.postMessage({ type: 'START_TRANSLATE', texts: textsToTranslate, langCode: msg.langCode, langName: msg.langName });
  }

  if (msg.type === 'APPLY_TRANSLATION') {
    const originalFrame = figma.currentPage.selection[0] as FrameNode;
    const clonedFrame = originalFrame.clone();
    clonedFrame.y = originalFrame.y + originalFrame.height + 100;

    // Đặt tên theo ngôn ngữ thực tế
    const langLabel = msg.langName || msg.langCode || 'Translated';
    clonedFrame.name = originalFrame.name + ` (${langLabel})`;

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

    figma.currentPage.selection = [clonedFrame];
    figma.viewport.scrollAndZoomIntoView([clonedFrame]);
    figma.notify(`🎉 Dịch xong! ${translatedCount} text đã dịch, ${skippedCount} text bỏ qua.`);

    // Gửi message về UI báo hoàn tất
    figma.ui.postMessage({
      type: 'TRANSLATION_DONE',
      translatedCount,
      skippedCount,
      langName: langLabel
    });
  }
};