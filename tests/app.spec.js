const { test, expect } = require('@playwright/test');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// --- Helper to create dummy assets ---
async function createDummyAssets() {
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
    }

    // Create PDF 1
    const pdf1 = await PDFDocument.create();
    const page1 = pdf1.addPage([600, 400]);
    page1.drawText('PDF 1 - Page 1');
    const pdf1Bytes = await pdf1.save();
    fs.writeFileSync(path.join(assetsDir, 'test1.pdf'), pdf1Bytes);

    // Create PDF 2
    const pdf2 = await PDFDocument.create();
    const page2 = pdf2.addPage([600, 400]);
    page2.drawText('PDF 2 - Page 1');
    const pdf2Bytes = await pdf2.save();
    fs.writeFileSync(path.join(assetsDir, 'test2.pdf'), pdf2Bytes);

    // Create Image
    // Create a simple 1x1 pixel red JPG (base64)
    const jpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAJgABAAAAAAAAAAAAAAAAAAAAAxABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwBH/9k=';
    const jpgBuffer = Buffer.from(jpgBase64, 'base64');
    fs.writeFileSync(path.join(assetsDir, 'test.jpg'), jpgBuffer);

    return assetsDir;
}

test.beforeAll(async () => {
    await createDummyAssets();
});

test.describe('Privacy-First PDF Tools', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:8081');
    });

    test('should load the homepage correctly', async ({ page }) => {
        await expect(page).toHaveTitle(/Privacy-First PDF Tools/);
        await expect(page.locator('h1')).toContainText('Privacy-First PDF Tools');
    });

    test('should merge two PDFs', async ({ page }) => {
        // Click Merge Tab
        await page.click('button[data-target="merge"]');

        // Upload files
        const fileInput = page.locator('#merge-file-input');
        await fileInput.setInputFiles([
            'tests/assets/test1.pdf',
            'tests/assets/test2.pdf'
        ]);

        // Check if files are listed
        await expect(page.locator('#merge-file-list .file-item')).toHaveCount(2);

        // Verify previews are generated (wait for img tag)
        await expect(page.locator('#merge-file-list .file-item:first-child .preview-thumb')).toBeVisible();
        await expect(page.locator('#merge-file-list .file-item:nth-child(2) .preview-thumb')).toBeVisible();

        // Click Merge Button and wait for download
        const downloadPromise = page.waitForEvent('download');
        await page.click('#merge-btn');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('merged.pdf');

        // Optional: Verify file size > 0
        const path = await download.path();
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(0);
    });

    test('should split a PDF', async ({ page }) => {
        // Click Split Tab
        await page.click('button[data-target="split"]');

        // Upload file
        const fileInput = page.locator('#split-file-input');
        await fileInput.setInputFiles('tests/assets/test1.pdf');

        // Verify preview is displayed
        await expect(page.locator('#split-preview .preview-large')).toBeVisible();

        // Select Range Mode
        await page.selectOption('#split-mode', 'range');

        // Input Range
        await page.fill('#split-range-input input', '1');

        // Click Split Button and wait for download
        const downloadPromise = page.waitForEvent('download');
        await page.click('#split-btn');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('split.pdf');
    });

    test('should compress a PDF', async ({ page }) => {
        // Click Compress Tab
        await page.click('button[data-target="compress"]');

        // Upload file
        const fileInput = page.locator('#compress-file-input');
        await fileInput.setInputFiles('tests/assets/test1.pdf');

        // Verify preview is displayed
        await expect(page.locator('#compress-preview .preview-large')).toBeVisible();

        // Click Compress Button and wait for download
        const downloadPromise = page.waitForEvent('download');
        await page.click('#compress-btn');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('compressed.pdf');
    });

    test('should convert Image to PDF', async ({ page }) => {
        // Click Convert Tab
        await page.click('button[data-target="convert"]');

        // Upload file
        const fileInput = page.locator('#convert-file-input');
        await fileInput.setInputFiles('tests/assets/test.jpg');

        // Click Convert Button and wait for download
        const downloadPromise = page.waitForEvent('download');
        await page.click('#convert-btn');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('converted.pdf');
    });

    test('should convert PDF to Image', async ({ page }) => {
        // Click Convert Tab
        await page.click('button[data-target="convert"]');

        // Upload file
        const fileInput = page.locator('#convert-file-input');
        await fileInput.setInputFiles('tests/assets/test1.pdf');

        // Click Convert Button and wait for download
        // Note: The app downloads multiple files if multiple pages, or one if single.
        // Our test PDF has 1 page.
        const downloadPromise = page.waitForEvent('download');
        await page.click('#convert-btn');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/page-\d+\.jpg/);
    });
});
