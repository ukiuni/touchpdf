import * as PDFUtils from './pdf-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupDragAndDrop();
    setupMergeTool();
    setupSplitTool();
    setupCompressTool();
    setupConvertTool();
});

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.tool-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update buttons
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update sections
            const targetId = btn.dataset.target;
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });
        });
    });
}

function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.drop-zone');

    dropZones.forEach(zone => {
        const input = zone.querySelector('input[type="file"]');

        zone.addEventListener('click', () => input.click());

        input.addEventListener('change', (e) => {
            handleFiles(zone.id, e.target.files);
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            handleFiles(zone.id, e.dataTransfer.files);
        });
    });
}

// State management for tools
const state = {
    merge: { files: [] },
    split: { file: null },
    compress: { file: null },
    convert: { files: [] }
};

function handleFiles(zoneId, fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (zoneId === 'merge-drop-zone') {
        const pdfs = files.filter(f => f.type === 'application/pdf');
        state.merge.files.push(...pdfs);
        updateMergeFileList();
    } else if (zoneId === 'split-drop-zone') {
        const pdf = files.find(f => f.type === 'application/pdf');
        if (pdf) {
            state.split.file = pdf;
            updateSplitUI();
        }
    } else if (zoneId === 'compress-drop-zone') {
        const pdf = files.find(f => f.type === 'application/pdf');
        if (pdf) {
            state.compress.file = pdf;
            updateCompressUI();
        }
    } else if (zoneId === 'convert-drop-zone') {
        // Allow PDF, JPG, PNG
        const validFiles = files.filter(f =>
            f.type === 'application/pdf' ||
            f.type === 'image/jpeg' ||
            f.type === 'image/png'
        );
        state.convert.files = validFiles; // Replace, don't append for simplicity in this version
        updateConvertUI();
    }
}

// --- Merge Tool Logic ---
async function updateMergeFileList() {
    const list = document.getElementById('merge-file-list');
    const btn = document.getElementById('merge-btn');
    list.innerHTML = '';

    for (const [index, file] of state.merge.files.entries()) {
        const item = document.createElement('div');
        item.className = 'file-item';

        // Create preview
        let previewHtml = '<div class="preview-thumb"></div>';
        try {
            const previewUrl = await PDFUtils.getPdfPreview(file, 0.2);
            previewHtml = `<img src="${previewUrl}" class="preview-thumb" alt="Preview">`;
        } catch (e) {
            console.error('Preview failed', e);
        }

        item.innerHTML = `
            <div class="file-info">
                ${previewHtml}
                <span>${file.name}</span>
            </div>
            <button class="remove-file" data-index="${index}">&times;</button>
        `;
        list.appendChild(item);
    }

    // Add remove listeners
    list.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            state.merge.files.splice(idx, 1);
            updateMergeFileList();
        });
    });

    btn.disabled = state.merge.files.length < 2;
}

function setupMergeTool() {
    document.getElementById('merge-btn').addEventListener('click', async () => {
        const btn = document.getElementById('merge-btn');
        setLoading(btn, true);
        try {
            const mergedPdf = await PDFUtils.mergePDFs(state.merge.files);
            downloadFile(mergedPdf, 'merged.pdf');
            alert('結合が完了しました！');
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました: ' + e.message);
        } finally {
            setLoading(btn, false);
        }
    });
}

// --- Split Tool Logic ---
async function updateSplitUI() {
    const zone = document.getElementById('split-drop-zone');
    const options = document.getElementById('split-options');
    const btn = document.getElementById('split-btn');
    const previewContainer = document.getElementById('split-preview');

    if (state.split.file) {
        zone.querySelector('.drop-content p').textContent = state.split.file.name;
        options.classList.remove('hidden');
        btn.disabled = false;

        // Show preview
        try {
            const previewUrl = await PDFUtils.getPdfPreview(state.split.file, 0.5);
            previewContainer.innerHTML = `<img src="${previewUrl}" class="preview-large" alt="Preview">`;
        } catch (e) {
            console.error('Preview failed', e);
            previewContainer.innerHTML = '';
        }
    } else {
        previewContainer.innerHTML = '';
    }
}

function setupSplitTool() {
    const modeSelect = document.getElementById('split-mode');
    const rangeInput = document.getElementById('split-range-input');

    modeSelect.addEventListener('change', () => {
        if (modeSelect.value === 'range') {
            rangeInput.classList.remove('hidden');
        } else {
            rangeInput.classList.add('hidden');
        }
    });

    document.getElementById('split-btn').addEventListener('click', async () => {
        const btn = document.getElementById('split-btn');
        setLoading(btn, true);
        try {
            const mode = modeSelect.value;
            if (mode === 'all') {
                // Zip logic would go here, for now just alert
                alert('全ページ分割機能は準備中です。(ZIP圧縮の実装が必要)');
            } else {
                const range = rangeInput.querySelector('input').value;
                const splitPdf = await PDFUtils.splitPDF(state.split.file, range);
                downloadFile(splitPdf, 'split.pdf');
                alert('分割が完了しました！');
            }
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました: ' + e.message);
        } finally {
            setLoading(btn, false);
        }
    });
}

// --- Compress Tool Logic ---
async function updateCompressUI() {
    const zone = document.getElementById('compress-drop-zone');
    const options = document.getElementById('compress-options');
    const btn = document.getElementById('compress-btn');
    const previewContainer = document.getElementById('compress-preview');

    if (state.compress.file) {
        zone.querySelector('.drop-content p').textContent = state.compress.file.name;
        options.classList.remove('hidden');
        btn.disabled = false;

        // Show preview
        try {
            const previewUrl = await PDFUtils.getPdfPreview(state.compress.file, 0.5);
            previewContainer.innerHTML = `<img src="${previewUrl}" class="preview-large" alt="Preview">`;
        } catch (e) {
            console.error('Preview failed', e);
            previewContainer.innerHTML = '';
        }
    } else {
        previewContainer.innerHTML = '';
    }
}

function setupCompressTool() {
    document.getElementById('compress-btn').addEventListener('click', async () => {
        const btn = document.getElementById('compress-btn');
        setLoading(btn, true);
        try {
            const level = parseFloat(document.getElementById('compress-level').value);
            const compressedPdf = await PDFUtils.compressPDF(state.compress.file, level);
            downloadFile(compressedPdf, 'compressed.pdf');
            alert('圧縮が完了しました！');
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました: ' + e.message);
        } finally {
            setLoading(btn, false);
        }
    });
}

// --- Convert Tool Logic ---
function updateConvertUI() {
    const zone = document.getElementById('convert-drop-zone');
    const btn = document.getElementById('convert-btn');

    if (state.convert.files.length > 0) {
        const names = state.convert.files.map(f => f.name).join(', ');
        zone.querySelector('.drop-content p').textContent = names;
        btn.disabled = false;
    }
}

function setupConvertTool() {
    document.getElementById('convert-btn').addEventListener('click', async () => {
        const btn = document.getElementById('convert-btn');
        setLoading(btn, true);
        try {
            // Simple logic: if first file is image, convert images to PDF. If PDF, convert to images.
            const firstFile = state.convert.files[0];
            if (firstFile.type === 'application/pdf') {
                const images = await PDFUtils.pdfToImages(firstFile);

                // If single page, download directly. If multiple, we should ideally zip, but for now download individually or just the first one?
                // Let's download all of them.
                if (images.length === 1) {
                    downloadFile(images[0].blob, images[0].name);
                    alert('変換が完了しました！');
                } else {
                    alert(`変換が完了しました！ ${images.length}枚の画像をダウンロードします。`);
                    images.forEach((img, i) => {
                        setTimeout(() => downloadFile(img.blob, img.name), i * 500); // Stagger downloads
                    });
                }
            } else {
                const pdf = await PDFUtils.imagesToPDF(state.convert.files);
                downloadFile(pdf, 'converted.pdf');
                alert('変換が完了しました！');
            }
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました: ' + e.message);
        } finally {
            setLoading(btn, false);
        }
    });
}

// --- Utilities ---
function setLoading(btn, isLoading) {
    if (isLoading) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = '処理中...';
        btn.disabled = true;
    } else {
        btn.textContent = btn.dataset.originalText;
        btn.disabled = false;
    }
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
