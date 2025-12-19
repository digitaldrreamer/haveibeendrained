#!/usr/bin/env bun

/**
 * Crawls Chainabuse Solana reports by clicking cards and extracting full details.
 * 
 * Strategy:
 * 1. List page: Find all clickable report cards, extract report IDs
 * 2. Navigate to each detail page to get full info
 * 3. Extract: title, description, amount lost, reported addresses, domains, submitted info
 * 4. Skip restricted cards (law enforcement only)
 * 
 * Output: Crawlee Dataset with address-indexed reports
 */

import {
  Dataset,
  KeyValueStore,
  PlaywrightCrawler,
  ProxyConfiguration,
  log,
} from 'crawlee';
import fs from 'fs';
import os from 'os';
import path from 'path';

const START_URL = process.env.START_URL || 'https://chainabuse.com/chain/SOL';
const MAX_PAGES = Number(process.env.MAX_PAGES || 9999); // Scrape all pages by default
const MAX_REPORTS_PER_PAGE = Number(process.env.MAX_REPORTS_PER_PAGE || 9999); // Process all reports per page
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 60000);
const CLICK_DELAY_MS = Number(process.env.CLICK_DELAY_MS || 2000);
const PROXY_URL = process.env.PROXY_URL || '';
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const HEADLESS = process.env.HEADLESS !== 'false'; // Default true, set HEADLESS=false to see browser

const chromiumExec = path.join(
  os.homedir(),
  '.cache',
  'ms-playwright',
  'chromium-1200',
  'chrome-linux64',
  'chrome'
);

// Address-indexed map: address -> { address, reports: [...] }
const addressMap: Record<
  string,
  {
    address: string;
    reports: {
      reportId: string;
      title: string;
      description: string;
      amountLost?: string;
      domains: string[];
      submitted: string;
      submittedBy: string;
      page: number;
    }[];
  }
> = {};

const crawler = new PlaywrightCrawler({
  headless: HEADLESS,
  maxRequestRetries: 3,
  requestHandlerTimeoutSecs: 300, // 5 minutes per page (for large pages)
  maxConcurrency: 2, // Process 2 pages concurrently
  launchContext: {
    launchOptions: {
      executablePath: fs.existsSync(CHROME_PATH)
        ? CHROME_PATH
        : fs.existsSync(chromiumExec)
          ? chromiumExec
          : undefined,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--proxy-bypass-list=*',
      ],
    },
  },
  proxyConfiguration: PROXY_URL ? new ProxyConfiguration({ proxyUrls: [PROXY_URL] }) : undefined,
  requestHandler: async ({ page, request, enqueueLinks }) => {
    // Set UA
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    const url = request.url;

    // Handle detail pages (report/{id})
    if (url.includes('/report/')) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for actual report content to load (not just template)
      try {
        // Wait for either addresses, domains, or report-specific content
        await page.waitForSelector('.create-ResponsiveAddress__text, .create-ReportedSection__domain, [data-testid*="report"], .create-ReportContent', { timeout: 10000 }).catch(() => {});
      } catch {}
      
      await page.waitForTimeout(2000); // Give more time for dynamic content

      // Extract full report details
      const reportData = await page.evaluate(() => {
        // Title - look for report-specific title, not generic page title
        let title = '';
        // Try report-specific selectors first
        const reportTitle = document.querySelector('.create-ReportContent h1, .create-ReportContent h2, .create-ReportContent h3, [data-testid*="title"] h1, [data-testid*="title"] h2');
        if (reportTitle) {
          title = reportTitle.textContent?.trim() || '';
        } else {
          // Fallback: find first h1/h2/h3 that's not generic page text
          const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3'));
          for (const h of allHeadings) {
            const text = h.textContent?.trim() || '';
            if (text && 
                !text.includes('Solana Scam Reports') && 
                !text.includes('Check addresses') &&
                !text.includes('Chainabuse') &&
                text.length > 5) {
              title = text;
              break;
            }
          }
        }

        // Description - filter out generic page template text
        const allParas = Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim()).filter(Boolean);
        const descParas = allParas.filter(p => 
          !p.includes('Solana Scam Reports') &&
          !p.includes('Check addresses, URLs, IPs') &&
          !p.includes('Enter your email') &&
          !p.includes('Join the community') &&
          !p.includes('Chainabuse: Home') &&
          p.length > 10 // Filter out very short generic text
        );
        const description = descParas.join('\n\n');

        // Amount lost
            // Find "Amount lost" heading and get the next sibling paragraph with the amount
            let amountLost: string | undefined = undefined;
            const amountHeading = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5')).find(el => 
              el.textContent?.trim() === 'Amount lost' || el.textContent?.trim() === 'Amount Lost'
            );
            
            if (amountHeading) {
              // Look for the next sibling or following element with the amount
              let nextEl = amountHeading.nextElementSibling;
              while (nextEl && !amountLost) {
                const text = nextEl.textContent?.trim() || '';
                const amountMatch = text.match(/([\d,]+\.?\d*)\s*(USD|SOL|usd|sol)/i);
                if (amountMatch) {
                  amountLost = `${amountMatch[1]} ${amountMatch[2].toUpperCase()}`;
                  break;
                }
                nextEl = nextEl.nextElementSibling;
              }
              
              // If not found in siblings, search in parent container
              if (!amountLost) {
                const container = amountHeading.parentElement;
                const containerText = container?.textContent || '';
                const amountMatch = containerText.match(/Amount\s+lost[:\s]+([\d,]+\.?\d*)\s*(USD|SOL|usd|sol)/i);
                if (amountMatch) {
                  amountLost = `${amountMatch[1]} ${amountMatch[2].toUpperCase()}`;
                }
              }
            }

        // Extract addresses from ResponsiveAddress__text divs
        const addressDivs = document.querySelectorAll('.create-ResponsiveAddress__text');
        const addresses: string[] = [];
        addressDivs.forEach(div => {
          const text = div.textContent?.trim() || '';
          const addrMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
          if (addrMatch) {
            addresses.push(addrMatch[0]);
          }
        });

        // Also try to extract addresses from any text on the page (fallback)
        if (addresses.length === 0) {
          const pageText = document.body.textContent || '';
          const allAddressMatches = pageText.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
          if (allAddressMatches) {
            // Filter out known system addresses and keep only unique
            const systemAddrs = ['11111111111111111111111111111111', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'];
            const uniqueAddrs = Array.from(new Set(allAddressMatches.filter(addr => !systemAddrs.includes(addr))));
            addresses.push(...uniqueAddrs.slice(0, 10)); // Limit to 10 addresses
          }
        }

        // Extract domains from ReportedSection__domain paragraphs
        const domainParas = document.querySelectorAll('.create-ReportedSection__domain');
        const domains: string[] = [];
        domainParas.forEach(p => {
          const text = p.textContent?.trim() || '';
          if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
            domains.push(text);
          }
        });

        // Also try to extract domains from links (fallback)
        if (domains.length === 0) {
          const links = document.querySelectorAll('a[href^="http://"], a[href^="https://"]');
          links.forEach(link => {
            const href = (link as HTMLAnchorElement).href;
            if (href && !href.includes('chainabuse.com') && !href.includes('solana.com')) {
              domains.push(href);
            }
          });
        }

        // Submitted info
        const submittedSection = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent?.includes('Submitted')
        );
        const submittedText = submittedSection?.textContent || '';
        const submittedMatch = submittedText.match(/Submitted\s+(?:by\s+)?([^\n]+?)\s+(\d+\s+\w+\s+ago)/i);
        const submittedBy = submittedMatch?.[1]?.trim() || 'Anonymous';
        const submitted = submittedMatch?.[2] || submittedText.match(/\d+\s+\w+\s+ago/i)?.[0] || '';

        return {
          title,
          description,
          amountLost,
          addresses: Array.from(new Set(addresses)),
          domains: Array.from(new Set(domains)),
          submitted,
          submittedBy,
        };
      });

      // Extract report ID from URL
      const reportIdMatch = url.match(/\/report\/([^\/\?]+)/);
      const reportId = reportIdMatch?.[1] || 'unknown';

      // Validate extraction - check if we got meaningful data
      const isEmpty = !reportData.title && 
                      reportData.addresses.length === 0 && 
                      reportData.domains.length === 0 &&
                      (!reportData.description || reportData.description.includes('Solana Scam Reports'));

      if (isEmpty) {
        console.log(`  ⚠️  Empty report detected: ${reportId} - might be restricted or not loaded`);
        // Still save it but mark as potentially incomplete
        await Dataset.pushData({
          reportId,
          ...reportData,
          url,
          scrapedAt: new Date().toISOString(),
          _incomplete: true,
          _note: 'Extraction returned empty data - page may not have loaded or report may be restricted',
        });
        return;
      }

      console.log(`  ✓ Extracted report: ${reportId} (${reportData.addresses.length} addresses, ${reportData.domains.length} domains)`);

      // Store in address map
      for (const addr of reportData.addresses) {
        if (!addressMap[addr]) {
          addressMap[addr] = { address: addr, reports: [] };
        }
        addressMap[addr].reports.push({
          reportId,
          title: reportData.title,
          description: reportData.description,
          amountLost: reportData.amountLost,
          domains: reportData.domains,
          submitted: reportData.submitted,
          submittedBy: reportData.submittedBy,
          page: 0, // Will be set from list page context
        });
      }

      // Save individual report
      await Dataset.pushData({
        reportId,
        ...reportData,
        url,
        scrapedAt: new Date().toISOString(),
      });

      return;
    }

    // Handle list pages (chain/SOL)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

    // Close cookie dialog
    try {
      const cookieClose = await page.waitForSelector('button:has-text("Close this dialog")', { timeout: 3000 });
      if (cookieClose) await cookieClose.click();
    } catch {}

    await page.waitForLoadState('domcontentloaded');
    // Wait for report cards to appear
    try {
      await page.waitForSelector('.create-ScamReportCard', { timeout: 30000 });
      console.log('Report cards detected');
    } catch {
      console.log('Warning: Report cards not found, continuing anyway...');
    }
    
    // Close any modals that might be blocking clicks
    try {
      // Close PreAuthModal or any other modals
      const modalClose = await page.$('button[aria-label*="Close"], button[aria-label*="close"], .create-Modal__overlay + button, [data-state="open"] button');
      if (modalClose) {
        await modalClose.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
      
      // Try to close modal by clicking overlay or pressing Escape
      const modalOverlay = await page.$('.create-Modal__overlay[data-state="open"]');
      if (modalOverlay) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } catch {
      // Modal might not be present, continue
    }
    
    await page.waitForTimeout(2000); // Wait for JS to render

    // Find clickable report cards and extract their URLs
    // Strategy: Extract all report URLs and enqueue them for processing
    const cardInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.create-ScamReportCard'));
      const clickableCards: Array<{ 
        title: string; 
        url: string | null;
        addresses: string[];
      }> = [];

      for (const card of cards) {
        const main = card.querySelector('.create-ScamReportCard__main');
        
        // Check if card is clickable (has tabindex="0" role="button")
        const isClickable = main?.getAttribute('tabindex') === '0' && 
                          main?.getAttribute('role') === 'button';
        
        // Skip private/restricted cards (have is-private class)
        const isPrivate = card.querySelector('.create-ScamReportCard__body.is-private') !== null;
        
        if (!isClickable || isPrivate) continue;

        // Extract title from category label
        const titleEl = card.querySelector('.create-ScamReportCard__category-label');
        const title = titleEl?.textContent?.trim() || '';

        // Extract addresses from ResponsiveAddress__text divs
        const addressDivs = card.querySelectorAll('.create-ResponsiveAddress__text');
        const addresses: string[] = [];
        addressDivs.forEach(div => {
          const text = div.textContent?.trim() || '';
          // Solana addresses are 32-44 base58 chars
          const addrMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
          if (addrMatch) {
            addresses.push(addrMatch[0]);
          }
        });

        if (addresses.length === 0) continue;

        // Try to find link to detail page - check for any link with /report/ in href
        let url: string | null = null;
        const link = card.querySelector('a[href*="/report/"]');
        if (link) {
          url = (link as HTMLAnchorElement).href;
        } else {
          // If no direct link, the card itself is clickable and will navigate
          // We'll need to click it to get the URL, but for now try to construct it
          // from the card's data attributes or we'll handle via clicking
        }

        clickableCards.push({
          title: title.slice(0, 100),
          url,
          addresses,
        });
      }

      return clickableCards;
    });

    console.log(`Found ${cardInfo.length} clickable report cards`);

    if (cardInfo.length === 0) {
      console.log('No clickable cards found. Page might not be loaded correctly.');
      // Debug: Check what cards we have
      const debugInfo = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.create-ScamReportCard'));
        return {
          total: cards.length,
          clickable: cards.filter(c => {
            const main = c.querySelector('.create-ScamReportCard__main');
            return main?.getAttribute('tabindex') === '0';
          }).length,
          private: cards.filter(c => c.querySelector('.is-private')).length,
        };
      });
      console.log(`Debug: ${debugInfo.total} cards, ${debugInfo.clickable} clickable, ${debugInfo.private} private`);
    } else {
      // Extract report URLs by clicking cards to get the actual URLs
      const reportUrls: string[] = [];
      const cardsToProcess = cardInfo.slice(0, MAX_REPORTS_PER_PAGE);
      
      console.log(`Extracting URLs from ${cardsToProcess.length} cards...`);
      
      for (let i = 0; i < cardsToProcess.length; i++) {
        try {
          // Re-query cards to get fresh elements
          const cards = await page.$$('.create-ScamReportCard');
          if (i >= cards.length) break;

          const card = cards[i];
          const mainSection = await card.$('.create-ScamReportCard__main[tabindex="0"]');
          if (!mainSection) continue;

          // Close any modals before clicking - try multiple methods
          try {
            // Method 1: Press Escape
            const modalOverlay = await page.$('.create-Modal__overlay[data-state="open"], .create-PreAuthModal');
            if (modalOverlay) {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
            
            // Method 2: Click close button if exists
            const closeBtn = await page.$('button[aria-label*="Close"], button[aria-label*="close"], [data-state="open"] button[aria-label]').catch(() => null);
            if (closeBtn) {
              await closeBtn.click({ timeout: 2000 }).catch(() => {});
              await page.waitForTimeout(300);
            }
            
            // Method 3: Wait for modal to disappear
            await page.waitForSelector('.create-Modal__overlay[data-state="open"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
          } catch {}

          // Scroll card into view
          await mainSection.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);

          // Verify modal is gone before clicking
          const modalStillOpen = await page.$('.create-Modal__overlay[data-state="open"]').catch(() => null);
          if (modalStillOpen) {
            console.log(`  ⚠️  Modal still open for card ${i}, skipping...`);
            continue;
          }

          // Set up navigation promise to capture URL
          const navigationPromise = page.waitForNavigation({ 
            waitUntil: 'domcontentloaded',
            timeout: NAV_TIMEOUT_MS 
          }).catch(() => null);

          // Click the card - use force only if needed
          try {
            await mainSection.click({ timeout: 15000 });
          } catch (clickErr: any) {
            // If click fails due to overlay, try force click
            if (clickErr.message?.includes('intercepts pointer') || clickErr.message?.includes('overlay')) {
              console.log(`  ⚠️  Overlay blocking, using force click for card ${i}...`);
              await mainSection.click({ force: true, timeout: 10000 });
            } else {
              throw clickErr;
            }
          }
          await navigationPromise;
          await page.waitForTimeout(500);

          const currentUrl = page.url();
          if (currentUrl.includes('/report/')) {
            reportUrls.push(currentUrl);
            console.log(`  ✓ Extracted URL ${i + 1}/${cardsToProcess.length}: ${currentUrl.split('/report/')[1].split('?')[0]}`);
          }

          // Go back to list
          await page.goBack({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(CLICK_DELAY_MS);
        } catch (err: any) {
          console.log(`Error extracting URL from card ${i}: ${err.message}`);
          if (page.url().includes('/report/')) {
            await page.goBack({ waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
            await page.waitForTimeout(1000);
          }
        }
      }

      // Enqueue all report URLs for processing
      if (reportUrls.length > 0) {
        console.log(`\n📋 Enqueuing ${reportUrls.length} report detail pages...`);
        await enqueueLinks({
          urls: reportUrls,
          label: 'DETAIL',
        });
      }
    }

    // Pagination - enqueue next page if available
    const currentPageMatch = url.match(/[?&]page=(\d+)/);
    const currentPage = currentPageMatch ? parseInt(currentPageMatch[1]) : 1;
    
    if (currentPage < MAX_PAGES) {
      try {
        // Find next page button using Playwright's locator API (supports :has-text())
        const nextPageNum = currentPage + 1;
        const nextPageBtn = page.locator(`button.create-PageSelect__page`).filter({ hasText: String(nextPageNum) });
        const btnExists = await nextPageBtn.count() > 0;
        
        if (btnExists) {
          // Construct the next page URL
          const nextPageUrl = await page.evaluate((pageNum) => {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('page', String(pageNum));
            return currentUrl.toString();
          }, nextPageNum);

          console.log(`\n📄 Enqueuing page ${nextPageNum}...`);
          await enqueueLinks({
            urls: [nextPageUrl],
            label: 'LIST',
          });
        } else {
          console.log(`\n✅ No more pages. Reached end at page ${currentPage}`);
        }
      } catch (err: any) {
        console.log(`Could not navigate to next page: ${err.message}`);
      }
    }
  },
});

// Suppress logs
log.setLevel(log.LEVELS.ERROR);

// Run and save results
await crawler.run([{ url: START_URL }]);

// Save address-indexed map
const kv = await KeyValueStore.open();
await kv.setValue('addresses', addressMap);

// Dataset is automatically saved by Crawlee, but let's verify
const dataset = await Dataset.open();
const data = await dataset.getData();
console.log(`\n📊 Dataset contains ${data.items.length} items`);

// Output summary
const totalReports = Object.values(addressMap).reduce((sum, a) => sum + a.reports.length, 0);
console.log(`\n✅ Scraping complete:`);
console.log(`   Unique addresses: ${Object.keys(addressMap).length}`);
console.log(`   Total reports: ${totalReports}`);
console.log(`\n📁 Results saved to:`);
console.log(`   - Dataset: storage/datasets/default/`);
console.log(`   - Address map: storage/key_value_stores/default/addresses.json\n`);
