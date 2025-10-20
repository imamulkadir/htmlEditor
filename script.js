require.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.40.0/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: ``,
    language: "html",
    theme: "vs-dark",
    wordWrap: "on",
    fontSize: "16",
    wrappingStrategy: "advanced",
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    formatOnPaste: false,
    formatOnType: false,
    autoIndent: "none",
    detectIndentation: false,
    readOnly: false,
    minimap: { enabled: true },
    renderWhitespace: "none",
    renderControlCharacters: false,
    useShadowDOM: false, // important for raw rendering consistency
    renderValidationDecorations: "off",
    scrollbar: {
      horizontal: "visible", // force horizontal scrollbar for long lines
      vertical: "visible",
      alwaysConsumeMouseWheel: false,
    },
  });

  let currentHighlight = [];
  let updateTimeout;
  let markerMap = {}; // marker ID -> editor text position

  function updateOutput() {
    const outputFrame = document.getElementById("output-frame");
    const htmlContent = editor.getValue();
    const outputDoc =
      outputFrame.contentDocument || outputFrame.contentWindow.document;

    // inject markers and store positions
    const markedHTML = addUniqueMarkers(htmlContent);

    outputDoc.open();
    outputDoc.write(markedHTML);
    outputDoc.close();

    attachClickListener(outputDoc);
    updateCursorAndHighlight();
  }

  // Inject unique markers into every tag and remember their editor positions
  function addUniqueMarkers(html) {
    markerMap = {};
    let counter = 0;

    // Regex for opening tags (excluding comments, DOCTYPE, closing tags)
    return html.replace(/<([a-zA-Z][^>\s]*)/g, (match, tagName, offset) => {
      const marker = `data-editor-marker="${counter}"`;
      markerMap[counter] = offset; // store the position
      counter++;
      return `<${tagName} ${marker}`;
    });
  }

  // When clicking elements in the iframe, scroll editor to exact match
  function attachClickListener(outputDoc) {
    const elements = outputDoc.querySelectorAll("[data-editor-marker]");
    elements.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const marker = el.getAttribute("data-editor-marker");
        if (marker && markerMap[marker] !== undefined) {
          const pos = editor.getModel().getPositionAt(markerMap[marker]);
          editor.setPosition(pos);
          editor.focus();
          editor.revealPosition(pos, monaco.editor.ScrollType.Smooth);
          updateCursorAndHighlight();
        }
      });
    });
  }

  function updateCursorAndHighlight() {
    const position = editor.getPosition();
    if (position) {
      const model = editor.getModel();
      const lineNumber = position.lineNumber;
      const lineRange = new monaco.Range(
        lineNumber,
        1,
        lineNumber,
        model.getLineMaxColumn(lineNumber)
      );
      editor.deltaDecorations(currentHighlight, []);
      currentHighlight = editor.deltaDecorations(
        [],
        [
          {
            range: lineRange,
            options: {
              isWholeLine: true,
              className: "line-highlight",
            },
          },
        ]
      );
      editor.revealRange(lineRange, monaco.editor.ScrollType.Smooth);
    }
  }

  function debouncedUpdate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => updateOutput(), 300);
  }

  editor.onDidChangeModelContent(() => debouncedUpdate());
  editor.onMouseDown(() => editor.deltaDecorations(currentHighlight, []));

  // File upload (loads raw HTML as-is)
  document
    .getElementById("htm_file")
    .addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        editor.setValue(e.target.result);
        updateOutput();
      };
      reader.readAsText(file);
    });

  // Download as .htm
  document
    .getElementById("download_htm")
    .addEventListener("click", function () {
      const content = editor.getValue();
      const blob = new Blob([content], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "form424b2.htm";
      link.click();
      URL.revokeObjectURL(link.href);
    });

  updateOutput();
});
